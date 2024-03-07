# h5wasm-worker

A package that loads the [h5wasm](https://github.com/usnistgov/h5wasm) library in a Web Worker, and provides an async API for reading HDF5 files through that Worker.  

Usage of the [Emscripten WORKERFS](https://emscripten.org/docs/api_reference/Filesystem-API.html#filesystem-api-workerfs) virtual filesystem in the Worker enables random read access to local files selected by the user, without first reading the entire contents to memory.

## Note that this library is not yet released, and the API is expected to change

### Example Usage
```javascript
import { load_with_workerfs, add_plugin_file } from 'h5wasm-worker';

const loaded_files = [];
const workerfs_input = document.getElementById("save_to_workerfs");
const load_plugin_input = document.getElementById("load_plugin");
workerfs_input.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const h5wasm_file_proxy = await load_with_workerfs(file);
  loaded_files.push(h5wasm_file_proxy);
});
load_plugin_input.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  await add_plugin_file(file);
});

// ... load a local file called "water_224.h5" in file input
// ... load plugin libH5Zbshuf.so

const h5wasm_file_proxy = loaded_files[0];
h5wasm_file_proxy.filename;
// '/workerfs/water_224.h5'
root_keys = await h5wasm_file_proxy.keys();
// ['entry_0000']
const entry = await h5wasm_file_proxy.get('entry_0000');
// GroupProxy {proxy: Proxy(Function), file_id: 72057594037927938n}
await entry.keys()
// ['0_measurement', '1_integration', '2_cormap', '3_time_average', '4_azimuthal_integration', 'BM29', 'program_name', 'start_time', 'title', 'water']
dset = await entry.get('0_measurement/images')
await dset.metadata;
// {signed: true, type: 0, cset: -1, vlen: false, littleEndian: true, …}
await dset.shape;
// [10, 1043, 981]
s = await dset.slice([[0,1]]);
// Int32Array(1023183) [2, 0, 2, 0, 2, 1, 2, 2, 0, 0, 3, 0, 2, 4, 4, 1, 2, 3, 0, 1, 3, 0, 0, 3, 2, 4, 2, 7, 1, 1, 3, 3, 3, 2, 2, 2, 2, 0, 1, 6, 1, 1, 1, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 0, 4, 1, 1, 2, 4, 6, 1, 0, 1, 7, 0, 2, 3, 1, 3, 1, 4, 2, 3, 0, 4, 0, 2, 3, 4, 2, 2, 1, 3, 2, 2, 1, 3, 4, 1, 1, 3, 1, 2, 2, 3, 2, 1, 2, …]
console.time('slice'); s = await dset.slice([[1,2]]); console.timeEnd('slice');
// slice: 37.31884765625 ms
```