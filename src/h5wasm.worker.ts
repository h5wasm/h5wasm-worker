import * as Comlink from 'comlink';
import * as h5wasm from 'h5wasm';

type H5Module = typeof h5wasm.Module;

const WORKERFS_MOUNT = '/workerfs';

function dirname(path: string) {
  // adapted from dirname function in posixpath.py
  const sep = "/";
  const sep_index = path.lastIndexOf(sep) + 1;
  let head = path.slice(0, sep_index);
  if (head && head !== sep.repeat(head.length)) {
    // strip end slashes
    head = head.replace(/(\/)+$/, '');
  }
  return head;
}

// function basename(path: string) {
//   // adapted from basename function in posixpath.py
//   const sep = "/";
//   const sep_index = path.lastIndexOf(sep) + 1;
//   return path.slice(sep_index);
// }

async function save_to_workerfs(file: File) {
  const { FS, WORKERFS, mount } = await workerfs_promise;
  const { name: filename } = file;
  const output_path = `${WORKERFS_MOUNT}/${filename}`;
  if (FS.analyzePath(output_path).exists) {
    console.warn(`File ${output_path} already exists. Overwriting...`);
  }
  WORKERFS.createNode(mount, filename, WORKERFS.FILE_MODE, 0, file);
  return output_path;
}

async function save_bytes_to_memfs(filepath: string, bytes: Uint8Array) {
  const { FS } = await h5wasm.ready;
  const path = dirname(filepath);
  const output_path = filepath;
  if (FS.analyzePath(output_path).exists) {
    console.warn(`File ${output_path} already exists. Overwriting...`);
  }
  if (!FS.analyzePath(path).exists) {
    FS.mkdirTree(path);
  }
  FS.writeFile(output_path, bytes);
  return output_path;
}

async function get_plugin_search_path() {
  const Module = await h5wasm.ready as H5Module;
  const plugin_paths = Module.get_plugin_search_paths();
  if (plugin_paths.length === 0) {
    console.warn("No plugin paths found.");
    return null;
  }
  else {
    return plugin_paths[0];
  }
}

async function get_plugin_names() {
  const { FS } = await h5wasm.ready as H5Module;
  const plugin_path = await get_plugin_search_path();
  return (plugin_path === null) ? null : FS.readdir(plugin_path) as string[];
}

async function add_plugin(filename: string, bytes: Uint8Array) {
  await h5wasm.ready;
  const plugin_path = await get_plugin_search_path();
  if (plugin_path === null) {
    console.warn("could not save plugin file: no plugin path found.")
    return null;
  }
  const filepath = `${plugin_path}/${filename}`;
  return await save_bytes_to_memfs(filepath, bytes);
}

async function save_to_memfs(file: File) {
  const { name: filename } = file;
  const ab = await file.arrayBuffer();
  return save_bytes_to_memfs(filename, new Uint8Array(ab));
}

async function _mount_workerfs() {
  const { FS } = await h5wasm.ready as H5Module;
  const { filesystems: { WORKERFS } } = FS;
  if (!FS.analyzePath(WORKERFS_MOUNT).exists) {
    FS.mkdir(WORKERFS_MOUNT);
  }
  const mount = FS.mount(WORKERFS, {}, WORKERFS_MOUNT);
  return { FS, WORKERFS, mount };
}

const workerfs_promise = _mount_workerfs();

const api = {
  WORKERFS_MOUNT,
  ready: h5wasm.ready,
  save_to_workerfs,
  save_to_memfs,
  save_bytes_to_memfs,
  get_plugin_search_path,
  get_plugin_names,
  add_plugin,
  H5WasmFile: h5wasm.File,
  Dataset: h5wasm.Dataset,
  Group: h5wasm.Group,
  Datatype: h5wasm.Datatype,
  BrokenSoftLink: h5wasm.BrokenSoftLink,
};

Comlink.expose(api);

export type H5WasmWorkerAPI = typeof api;