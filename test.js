// const readFileSync = require('fs').readFileSync;
// const wasmCode = readFileSync("./pkg/hello_wasm_bg.wasm");
// const encoded = new Buffer.from(wasmCode, 'binary').toString('base64');

// function asciiToBinary(str) {
//   if (typeof atob === 'function') {
//     // this works in the browser
//     return atob(str)
//   } else {
//     // this works in node
//     return new Buffer(str, 'base64').toString('binary');
//   }
// }

// function decode(encoded) {
//   var binaryString = asciiToBinary(encoded);
//   var bytes = new Uint8Array(binaryString.length);
//   for (var i = 0; i < binaryString.length; i++) {
//     bytes[i] = binaryString.charCodeAt(i);
//   }
//   return bytes.buffer;
// }

// const decoded = decode(encoded);
// console.log('decoded: ', decoded instanceof ArrayBuffer);

// WebAssembly.instantiate(fetch("./pkg/hello_wasm_bg.wasm"), {}).then(res => console.log(res)).catch(err => console.log("error here", err));

fetch("./pkg/hello_wasm_bg.wasm")
  .then((response) => response.arrayBuffer())
  .then((bytes) => WebAssembly.instantiate(bytes, {}))
  .then((results) => {
    results.instance.exports.exported_func();
  });