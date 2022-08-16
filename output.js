

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// See https://caniuse.com/mdn-javascript_builtins_object_assign

// See https://caniuse.com/mdn-javascript_builtins_bigint64array

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

// Normally we don't log exceptions but instead let them bubble out the top
// level where the embedding environment (e.g. the browser) can handle
// them.
// However under v8 and node we sometimes exit the process direcly in which case
// its up to use us to log the exception before exiting.
// If we fix https://github.com/emscripten-core/emscripten/issues/15080
// this may no longer be needed under node.
function logExceptionOnExit(e) {
  if (e instanceof ExitStatus) return;
  let toLog = e;
  if (e && typeof e == 'object' && e.stack) {
    toLog = [e, e.stack];
  }
  err('exiting due to exception: ' + toLog);
}

var fs;
var nodePath;
var requireNodeFS;

if (ENVIRONMENT_IS_NODE) {
  if (!(typeof process == 'object' && typeof require == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/';
  } else {
    scriptDirectory = __dirname + '/';
  }

// include: node_shell_read.js


requireNodeFS = () => {
  // Use nodePath as the indicator for these not being initialized,
  // since in some environments a global fs may have already been
  // created.
  if (!nodePath) {
    fs = require('fs');
    nodePath = require('path');
  }
};

read_ = function shell_read(filename, binary) {
  var ret = tryParseAsDataURI(filename);
  if (ret) {
    return binary ? ret : ret.toString();
  }
  requireNodeFS();
  filename = nodePath['normalize'](filename);
  return fs.readFileSync(filename, binary ? undefined : 'utf8');
};

readBinary = (filename) => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
    ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
};

readAsync = (filename, onload, onerror) => {
  var ret = tryParseAsDataURI(filename);
  if (ret) {
    onload(ret);
  }
  requireNodeFS();
  filename = nodePath['normalize'](filename);
  fs.readFile(filename, function(err, data) {
    if (err) onerror(err);
    else onload(data.buffer);
  });
};

// end include: node_shell_read.js
  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  // Without this older versions of node (< v15) will log unhandled rejections
  // but return 0, which is not normally the desired behaviour.  This is
  // not be needed with node v15 and about because it is now the default
  // behaviour:
  // See https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode
  process['on']('unhandledRejection', function(reason) { throw reason; });

  quit_ = (status, toThrow) => {
    if (keepRuntimeAlive()) {
      process['exitCode'] = status;
      throw toThrow;
    }
    logExceptionOnExit(toThrow);
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };

} else
if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof importScripts == 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      const data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    let data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer == 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data == 'object');
    return data;
  };

  readAsync = function readAsync(f, onload, onerror) {
    setTimeout(() => onload(readBinary(f)), 0);
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit == 'function') {
    quit_ = (status, toThrow) => {
      logExceptionOnExit(toThrow);
      quit(status);
    };
  }

  if (typeof print != 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console == 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != 'undefined' ? printErr : print);
  }

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }

  if (!(typeof window == 'object' || typeof importScripts == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js


  read_ = (url) => {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }

  setWindowTitle = (title) => document.title = title;
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

if (Module['quit']) quit_ = Module['quit'];legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");




var STACK_ALIGN = 16;
var POINTER_SIZE = 4;

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': case 'u8': return 1;
    case 'i16': case 'u16': return 2;
    case 'i32': case 'u32': return 4;
    case 'i64': case 'u64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length - 1] === '*') {
        return POINTER_SIZE;
      }
      if (type[0] === 'i') {
        const bits = Number(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      }
      return 0;
    }
  }
}

// include: runtime_debug.js


function legacyModuleProp(prop, newName) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get: function() {
        abort('Module.' + prop + ' has been replaced with plain ' + newName + ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)');
      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort('`Module.' + prop + '` was supplied but `' + prop + '` not included in INCOMING_MODULE_JS_API');
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingLibrarySymbol(sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get: function() {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        var msg = '`' + sym + '` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line';
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        warnOnce(msg);
        return undefined;
      }
    });
  }
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get: function() {
        var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// end include: runtime_debug.js
var tempRet0 = 0;
var setTempRet0 = (value) => { tempRet0 = value; };
var getTempRet0 = () => tempRet0;



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');
var noExitRuntime = Module['noExitRuntime'] || true;legacyModuleProp('noExitRuntime', 'noExitRuntime');

// include: wasm2js.js


// wasm2js.js - enough of a polyfill for the WebAssembly object so that we can load
// wasm2js code that way.

// Emit "var WebAssembly" if definitely using wasm2js. Otherwise, in MAYBE_WASM2JS
// mode, we can't use a "var" since it would prevent normal wasm from working.
/** @suppress{duplicate, const} */
var
WebAssembly = {
  // Note that we do not use closure quoting (this['buffer'], etc.) on these
  // functions, as they are just meant for internal use. In other words, this is
  // not a fully general polyfill.
  /** @constructor */
  Memory: function(opts) {
    this.buffer = new ArrayBuffer(opts['initial'] * 65536);
  },

  Module: function(binary) {
    // TODO: use the binary and info somehow - right now the wasm2js output is embedded in
    // the main JS
  },

  /** @constructor */
  Instance: function(module, info) {
    // TODO: use the module and info somehow - right now the wasm2js output is embedded in
    // the main JS
    // This will be replaced by the actual wasm2js code.
    this.exports = (
function instantiate(asmLibraryArg) {
function Table(ret) {
  // grow method not included; table is not growable
  ret.set = function(i, func) {
    this[i] = func;
  };
  ret.get = function(i) {
    return this[i];
  };
  return ret;
}

  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 1024, "TjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAAAAA8AQAAAAEAABUBQAATjEwX19jeHhhYml2MTE3X19jbGFzc190eXBlX2luZm9FAAAA8AQAADAEAAAkBAAATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAAAA8AQAAGAEAAAkBAAATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UA8AQAAJAEAACEBAAAAAAAAFQEAAABAAAAAgAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAAAAAA4BQAAAQAAAAkAAAADAAAABAAAAAUAAAAKAAAACwAAAAwAAABOMTBfX2N4eGFiaXYxMjBfX3NpX2NsYXNzX3R5cGVfaW5mb0UAAAAA8AQAABAFAABUBAAAU3Q5dHlwZV9pbmZvAAAAAMgEAABEBQAA");
  base64DecodeToExistingUint8Array(bufferView, 1372, "cAdQAA==");
  base64DecodeToExistingUint8Array(bufferView, 1376, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
}
function asmFunc(env) {
 var memory = env.memory;
 var buffer = memory.buffer;
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var abort = env.abort;
 var nan = NaN;
 var infinity = Infinity;
 var emscripten_resize_heap = env.emscripten_resize_heap;
 var __stack_pointer = 5244784;
 var __stack_end = 0;
 var __stack_base = 0;
 var i64toi32_i32$HIGH_BITS = 0;
 // EMSCRIPTEN_START_FUNCS
;
 function __wasm_call_ctors() {
  emscripten_stack_init();
 }
 
 function __errno_location() {
  return 1376 | 0;
 }
 
 function memset($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  var $3 = 0, i64toi32_i32$0 = 0, $4 = 0, i64toi32_i32$1 = 0, $6 = 0, $5 = 0, $6$hi = 0;
  label$1 : {
   if (!$2) {
    break label$1
   }
   HEAP8[$0 >> 0] = $1;
   $3 = $2 + $0 | 0;
   HEAP8[($3 + -1 | 0) >> 0] = $1;
   if ($2 >>> 0 < 3 >>> 0) {
    break label$1
   }
   HEAP8[($0 + 2 | 0) >> 0] = $1;
   HEAP8[($0 + 1 | 0) >> 0] = $1;
   HEAP8[($3 + -3 | 0) >> 0] = $1;
   HEAP8[($3 + -2 | 0) >> 0] = $1;
   if ($2 >>> 0 < 7 >>> 0) {
    break label$1
   }
   HEAP8[($0 + 3 | 0) >> 0] = $1;
   HEAP8[($3 + -4 | 0) >> 0] = $1;
   if ($2 >>> 0 < 9 >>> 0) {
    break label$1
   }
   $4 = (0 - $0 | 0) & 3 | 0;
   $3 = $0 + $4 | 0;
   $1 = Math_imul($1 & 255 | 0, 16843009);
   HEAP32[$3 >> 2] = $1;
   $4 = ($2 - $4 | 0) & -4 | 0;
   $2 = $3 + $4 | 0;
   HEAP32[($2 + -4 | 0) >> 2] = $1;
   if ($4 >>> 0 < 9 >>> 0) {
    break label$1
   }
   HEAP32[($3 + 8 | 0) >> 2] = $1;
   HEAP32[($3 + 4 | 0) >> 2] = $1;
   HEAP32[($2 + -8 | 0) >> 2] = $1;
   HEAP32[($2 + -12 | 0) >> 2] = $1;
   if ($4 >>> 0 < 25 >>> 0) {
    break label$1
   }
   HEAP32[($3 + 24 | 0) >> 2] = $1;
   HEAP32[($3 + 20 | 0) >> 2] = $1;
   HEAP32[($3 + 16 | 0) >> 2] = $1;
   HEAP32[($3 + 12 | 0) >> 2] = $1;
   HEAP32[($2 + -16 | 0) >> 2] = $1;
   HEAP32[($2 + -20 | 0) >> 2] = $1;
   HEAP32[($2 + -24 | 0) >> 2] = $1;
   HEAP32[($2 + -28 | 0) >> 2] = $1;
   $5 = $3 & 4 | 0 | 24 | 0;
   $2 = $4 - $5 | 0;
   if ($2 >>> 0 < 32 >>> 0) {
    break label$1
   }
   i64toi32_i32$0 = 0;
   i64toi32_i32$1 = 1;
   i64toi32_i32$1 = __wasm_i64_mul($1 | 0, i64toi32_i32$0 | 0, 1 | 0, i64toi32_i32$1 | 0) | 0;
   i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
   $6 = i64toi32_i32$1;
   $6$hi = i64toi32_i32$0;
   $1 = $3 + $5 | 0;
   label$2 : while (1) {
    i64toi32_i32$0 = $6$hi;
    i64toi32_i32$1 = $1;
    HEAP32[($1 + 24 | 0) >> 2] = $6;
    HEAP32[($1 + 28 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1;
    HEAP32[($1 + 16 | 0) >> 2] = $6;
    HEAP32[($1 + 20 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1;
    HEAP32[($1 + 8 | 0) >> 2] = $6;
    HEAP32[($1 + 12 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1;
    HEAP32[$1 >> 2] = $6;
    HEAP32[($1 + 4 | 0) >> 2] = i64toi32_i32$0;
    $1 = $1 + 32 | 0;
    $2 = $2 + -32 | 0;
    if ($2 >>> 0 > 31 >>> 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $0 | 0;
 }
 
 function __lock($0) {
  $0 = $0 | 0;
 }
 
 function __unlock($0) {
  $0 = $0 | 0;
 }
 
 function dlmalloc($0) {
  $0 = $0 | 0;
  var $4 = 0, $5 = 0, $7 = 0, $8 = 0, $3 = 0, $2 = 0, $11 = 0, $6 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $9 = 0, i64toi32_i32$2 = 0, $10 = 0, $1 = 0, $79 = 0, $92 = 0, $103 = 0, $111 = 0, $119 = 0, $209 = 0, $220 = 0, $228 = 0, $236 = 0, $271 = 0, $338 = 0, $345 = 0, $352 = 0, $443 = 0, $454 = 0, $462 = 0, $470 = 0, $1156 = 0, $1163 = 0, $1170 = 0, $1292 = 0, $1294 = 0, $1354 = 0, $1361 = 0, $1368 = 0, $1599 = 0, $1606 = 0, $1613 = 0;
  $1 = __stack_pointer - 16 | 0;
  __stack_pointer = $1;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             label$12 : {
              if ($0 >>> 0 > 244 >>> 0) {
               break label$12
              }
              label$13 : {
               $2 = HEAP32[(0 + 1380 | 0) >> 2] | 0;
               $3 = $0 >>> 0 < 11 >>> 0 ? 16 : ($0 + 11 | 0) & -8 | 0;
               $4 = $3 >>> 3 | 0;
               $0 = $2 >>> $4 | 0;
               if (!($0 & 3 | 0)) {
                break label$13
               }
               label$14 : {
                label$15 : {
                 $5 = (($0 ^ -1 | 0) & 1 | 0) + $4 | 0;
                 $4 = $5 << 3 | 0;
                 $0 = $4 + 1420 | 0;
                 $4 = HEAP32[($4 + 1428 | 0) >> 2] | 0;
                 $3 = HEAP32[($4 + 8 | 0) >> 2] | 0;
                 if (($0 | 0) != ($3 | 0)) {
                  break label$15
                 }
                 HEAP32[(0 + 1380 | 0) >> 2] = $2 & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
                 break label$14;
                }
                HEAP32[($3 + 12 | 0) >> 2] = $0;
                HEAP32[($0 + 8 | 0) >> 2] = $3;
               }
               $0 = $4 + 8 | 0;
               $5 = $5 << 3 | 0;
               HEAP32[($4 + 4 | 0) >> 2] = $5 | 3 | 0;
               $4 = $4 + $5 | 0;
               HEAP32[($4 + 4 | 0) >> 2] = HEAP32[($4 + 4 | 0) >> 2] | 0 | 1 | 0;
               break label$1;
              }
              $6 = HEAP32[(0 + 1388 | 0) >> 2] | 0;
              if ($3 >>> 0 <= $6 >>> 0) {
               break label$11
              }
              label$16 : {
               if (!$0) {
                break label$16
               }
               label$17 : {
                label$18 : {
                 $79 = $0 << $4 | 0;
                 $0 = 2 << $4 | 0;
                 $0 = $79 & ($0 | (0 - $0 | 0) | 0) | 0;
                 $0 = ($0 & (0 - $0 | 0) | 0) + -1 | 0;
                 $92 = $0;
                 $0 = ($0 >>> 12 | 0) & 16 | 0;
                 $4 = $92 >>> $0 | 0;
                 $5 = ($4 >>> 5 | 0) & 8 | 0;
                 $103 = $5 | $0 | 0;
                 $0 = $4 >>> $5 | 0;
                 $4 = ($0 >>> 2 | 0) & 4 | 0;
                 $111 = $103 | $4 | 0;
                 $0 = $0 >>> $4 | 0;
                 $4 = ($0 >>> 1 | 0) & 2 | 0;
                 $119 = $111 | $4 | 0;
                 $0 = $0 >>> $4 | 0;
                 $4 = ($0 >>> 1 | 0) & 1 | 0;
                 $4 = ($119 | $4 | 0) + ($0 >>> $4 | 0) | 0;
                 $0 = $4 << 3 | 0;
                 $5 = $0 + 1420 | 0;
                 $0 = HEAP32[($0 + 1428 | 0) >> 2] | 0;
                 $7 = HEAP32[($0 + 8 | 0) >> 2] | 0;
                 if (($5 | 0) != ($7 | 0)) {
                  break label$18
                 }
                 $2 = $2 & (__wasm_rotl_i32(-2 | 0, $4 | 0) | 0) | 0;
                 HEAP32[(0 + 1380 | 0) >> 2] = $2;
                 break label$17;
                }
                HEAP32[($7 + 12 | 0) >> 2] = $5;
                HEAP32[($5 + 8 | 0) >> 2] = $7;
               }
               HEAP32[($0 + 4 | 0) >> 2] = $3 | 3 | 0;
               $7 = $0 + $3 | 0;
               $4 = $4 << 3 | 0;
               $5 = $4 - $3 | 0;
               HEAP32[($7 + 4 | 0) >> 2] = $5 | 1 | 0;
               HEAP32[($0 + $4 | 0) >> 2] = $5;
               label$19 : {
                if (!$6) {
                 break label$19
                }
                $3 = ($6 & -8 | 0) + 1420 | 0;
                $4 = HEAP32[(0 + 1400 | 0) >> 2] | 0;
                label$20 : {
                 label$21 : {
                  $8 = 1 << ($6 >>> 3 | 0) | 0;
                  if ($2 & $8 | 0) {
                   break label$21
                  }
                  HEAP32[(0 + 1380 | 0) >> 2] = $2 | $8 | 0;
                  $8 = $3;
                  break label$20;
                 }
                 $8 = HEAP32[($3 + 8 | 0) >> 2] | 0;
                }
                HEAP32[($3 + 8 | 0) >> 2] = $4;
                HEAP32[($8 + 12 | 0) >> 2] = $4;
                HEAP32[($4 + 12 | 0) >> 2] = $3;
                HEAP32[($4 + 8 | 0) >> 2] = $8;
               }
               $0 = $0 + 8 | 0;
               HEAP32[(0 + 1400 | 0) >> 2] = $7;
               HEAP32[(0 + 1388 | 0) >> 2] = $5;
               break label$1;
              }
              $9 = HEAP32[(0 + 1384 | 0) >> 2] | 0;
              if (!$9) {
               break label$11
              }
              $0 = ($9 & (0 - $9 | 0) | 0) + -1 | 0;
              $209 = $0;
              $0 = ($0 >>> 12 | 0) & 16 | 0;
              $4 = $209 >>> $0 | 0;
              $5 = ($4 >>> 5 | 0) & 8 | 0;
              $220 = $5 | $0 | 0;
              $0 = $4 >>> $5 | 0;
              $4 = ($0 >>> 2 | 0) & 4 | 0;
              $228 = $220 | $4 | 0;
              $0 = $0 >>> $4 | 0;
              $4 = ($0 >>> 1 | 0) & 2 | 0;
              $236 = $228 | $4 | 0;
              $0 = $0 >>> $4 | 0;
              $4 = ($0 >>> 1 | 0) & 1 | 0;
              $7 = HEAP32[(((($236 | $4 | 0) + ($0 >>> $4 | 0) | 0) << 2 | 0) + 1684 | 0) >> 2] | 0;
              $4 = ((HEAP32[($7 + 4 | 0) >> 2] | 0) & -8 | 0) - $3 | 0;
              $5 = $7;
              label$22 : {
               label$23 : while (1) {
                label$24 : {
                 $0 = HEAP32[($5 + 16 | 0) >> 2] | 0;
                 if ($0) {
                  break label$24
                 }
                 $0 = HEAP32[($5 + 20 | 0) >> 2] | 0;
                 if (!$0) {
                  break label$22
                 }
                }
                $5 = ((HEAP32[($0 + 4 | 0) >> 2] | 0) & -8 | 0) - $3 | 0;
                $271 = $5;
                $5 = $5 >>> 0 < $4 >>> 0;
                $4 = $5 ? $271 : $4;
                $7 = $5 ? $0 : $7;
                $5 = $0;
                continue label$23;
               };
              }
              $10 = HEAP32[($7 + 24 | 0) >> 2] | 0;
              label$25 : {
               $8 = HEAP32[($7 + 12 | 0) >> 2] | 0;
               if (($8 | 0) == ($7 | 0)) {
                break label$25
               }
               $0 = HEAP32[($7 + 8 | 0) >> 2] | 0;
               HEAP32[(0 + 1396 | 0) >> 2] | 0;
               HEAP32[($0 + 12 | 0) >> 2] = $8;
               HEAP32[($8 + 8 | 0) >> 2] = $0;
               break label$2;
              }
              label$26 : {
               $5 = $7 + 20 | 0;
               $0 = HEAP32[$5 >> 2] | 0;
               if ($0) {
                break label$26
               }
               $0 = HEAP32[($7 + 16 | 0) >> 2] | 0;
               if (!$0) {
                break label$10
               }
               $5 = $7 + 16 | 0;
              }
              label$27 : while (1) {
               $11 = $5;
               $8 = $0;
               $5 = $0 + 20 | 0;
               $0 = HEAP32[$5 >> 2] | 0;
               if ($0) {
                continue label$27
               }
               $5 = $8 + 16 | 0;
               $0 = HEAP32[($8 + 16 | 0) >> 2] | 0;
               if ($0) {
                continue label$27
               }
               break label$27;
              };
              HEAP32[$11 >> 2] = 0;
              break label$2;
             }
             $3 = -1;
             if ($0 >>> 0 > -65 >>> 0) {
              break label$11
             }
             $0 = $0 + 11 | 0;
             $3 = $0 & -8 | 0;
             $6 = HEAP32[(0 + 1384 | 0) >> 2] | 0;
             if (!$6) {
              break label$11
             }
             $11 = 0;
             label$28 : {
              if ($3 >>> 0 < 256 >>> 0) {
               break label$28
              }
              $11 = 31;
              if ($3 >>> 0 > 16777215 >>> 0) {
               break label$28
              }
              $0 = $0 >>> 8 | 0;
              $338 = $0;
              $0 = (($0 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
              $4 = $338 << $0 | 0;
              $345 = $4;
              $4 = (($4 + 520192 | 0) >>> 16 | 0) & 4 | 0;
              $5 = $345 << $4 | 0;
              $352 = $5;
              $5 = (($5 + 245760 | 0) >>> 16 | 0) & 2 | 0;
              $0 = (($352 << $5 | 0) >>> 15 | 0) - ($0 | $4 | 0 | $5 | 0) | 0;
              $11 = ($0 << 1 | 0 | (($3 >>> ($0 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
             }
             $4 = 0 - $3 | 0;
             label$29 : {
              label$30 : {
               label$31 : {
                label$32 : {
                 $5 = HEAP32[(($11 << 2 | 0) + 1684 | 0) >> 2] | 0;
                 if ($5) {
                  break label$32
                 }
                 $0 = 0;
                 $8 = 0;
                 break label$31;
                }
                $0 = 0;
                $7 = $3 << (($11 | 0) == (31 | 0) ? 0 : 25 - ($11 >>> 1 | 0) | 0) | 0;
                $8 = 0;
                label$33 : while (1) {
                 label$34 : {
                  $2 = ((HEAP32[($5 + 4 | 0) >> 2] | 0) & -8 | 0) - $3 | 0;
                  if ($2 >>> 0 >= $4 >>> 0) {
                   break label$34
                  }
                  $4 = $2;
                  $8 = $5;
                  if ($4) {
                   break label$34
                  }
                  $4 = 0;
                  $8 = $5;
                  $0 = $5;
                  break label$30;
                 }
                 $2 = HEAP32[($5 + 20 | 0) >> 2] | 0;
                 $5 = HEAP32[(($5 + (($7 >>> 29 | 0) & 4 | 0) | 0) + 16 | 0) >> 2] | 0;
                 $0 = $2 ? (($2 | 0) == ($5 | 0) ? $0 : $2) : $0;
                 $7 = $7 << 1 | 0;
                 if ($5) {
                  continue label$33
                 }
                 break label$33;
                };
               }
               label$35 : {
                if ($0 | $8 | 0) {
                 break label$35
                }
                $8 = 0;
                $0 = 2 << $11 | 0;
                $0 = ($0 | (0 - $0 | 0) | 0) & $6 | 0;
                if (!$0) {
                 break label$11
                }
                $0 = ($0 & (0 - $0 | 0) | 0) + -1 | 0;
                $443 = $0;
                $0 = ($0 >>> 12 | 0) & 16 | 0;
                $5 = $443 >>> $0 | 0;
                $7 = ($5 >>> 5 | 0) & 8 | 0;
                $454 = $7 | $0 | 0;
                $0 = $5 >>> $7 | 0;
                $5 = ($0 >>> 2 | 0) & 4 | 0;
                $462 = $454 | $5 | 0;
                $0 = $0 >>> $5 | 0;
                $5 = ($0 >>> 1 | 0) & 2 | 0;
                $470 = $462 | $5 | 0;
                $0 = $0 >>> $5 | 0;
                $5 = ($0 >>> 1 | 0) & 1 | 0;
                $0 = HEAP32[(((($470 | $5 | 0) + ($0 >>> $5 | 0) | 0) << 2 | 0) + 1684 | 0) >> 2] | 0;
               }
               if (!$0) {
                break label$29
               }
              }
              label$36 : while (1) {
               $2 = ((HEAP32[($0 + 4 | 0) >> 2] | 0) & -8 | 0) - $3 | 0;
               $7 = $2 >>> 0 < $4 >>> 0;
               label$37 : {
                $5 = HEAP32[($0 + 16 | 0) >> 2] | 0;
                if ($5) {
                 break label$37
                }
                $5 = HEAP32[($0 + 20 | 0) >> 2] | 0;
               }
               $4 = $7 ? $2 : $4;
               $8 = $7 ? $0 : $8;
               $0 = $5;
               if ($0) {
                continue label$36
               }
               break label$36;
              };
             }
             if (!$8) {
              break label$11
             }
             if ($4 >>> 0 >= ((HEAP32[(0 + 1388 | 0) >> 2] | 0) - $3 | 0) >>> 0) {
              break label$11
             }
             $11 = HEAP32[($8 + 24 | 0) >> 2] | 0;
             label$38 : {
              $7 = HEAP32[($8 + 12 | 0) >> 2] | 0;
              if (($7 | 0) == ($8 | 0)) {
               break label$38
              }
              $0 = HEAP32[($8 + 8 | 0) >> 2] | 0;
              HEAP32[(0 + 1396 | 0) >> 2] | 0;
              HEAP32[($0 + 12 | 0) >> 2] = $7;
              HEAP32[($7 + 8 | 0) >> 2] = $0;
              break label$3;
             }
             label$39 : {
              $5 = $8 + 20 | 0;
              $0 = HEAP32[$5 >> 2] | 0;
              if ($0) {
               break label$39
              }
              $0 = HEAP32[($8 + 16 | 0) >> 2] | 0;
              if (!$0) {
               break label$9
              }
              $5 = $8 + 16 | 0;
             }
             label$40 : while (1) {
              $2 = $5;
              $7 = $0;
              $5 = $0 + 20 | 0;
              $0 = HEAP32[$5 >> 2] | 0;
              if ($0) {
               continue label$40
              }
              $5 = $7 + 16 | 0;
              $0 = HEAP32[($7 + 16 | 0) >> 2] | 0;
              if ($0) {
               continue label$40
              }
              break label$40;
             };
             HEAP32[$2 >> 2] = 0;
             break label$3;
            }
            label$41 : {
             $0 = HEAP32[(0 + 1388 | 0) >> 2] | 0;
             if ($0 >>> 0 < $3 >>> 0) {
              break label$41
             }
             $4 = HEAP32[(0 + 1400 | 0) >> 2] | 0;
             label$42 : {
              label$43 : {
               $5 = $0 - $3 | 0;
               if ($5 >>> 0 < 16 >>> 0) {
                break label$43
               }
               HEAP32[(0 + 1388 | 0) >> 2] = $5;
               $7 = $4 + $3 | 0;
               HEAP32[(0 + 1400 | 0) >> 2] = $7;
               HEAP32[($7 + 4 | 0) >> 2] = $5 | 1 | 0;
               HEAP32[($4 + $0 | 0) >> 2] = $5;
               HEAP32[($4 + 4 | 0) >> 2] = $3 | 3 | 0;
               break label$42;
              }
              HEAP32[(0 + 1400 | 0) >> 2] = 0;
              HEAP32[(0 + 1388 | 0) >> 2] = 0;
              HEAP32[($4 + 4 | 0) >> 2] = $0 | 3 | 0;
              $0 = $4 + $0 | 0;
              HEAP32[($0 + 4 | 0) >> 2] = HEAP32[($0 + 4 | 0) >> 2] | 0 | 1 | 0;
             }
             $0 = $4 + 8 | 0;
             break label$1;
            }
            label$44 : {
             $7 = HEAP32[(0 + 1392 | 0) >> 2] | 0;
             if ($7 >>> 0 <= $3 >>> 0) {
              break label$44
             }
             $4 = $7 - $3 | 0;
             HEAP32[(0 + 1392 | 0) >> 2] = $4;
             $0 = HEAP32[(0 + 1404 | 0) >> 2] | 0;
             $5 = $0 + $3 | 0;
             HEAP32[(0 + 1404 | 0) >> 2] = $5;
             HEAP32[($5 + 4 | 0) >> 2] = $4 | 1 | 0;
             HEAP32[($0 + 4 | 0) >> 2] = $3 | 3 | 0;
             $0 = $0 + 8 | 0;
             break label$1;
            }
            label$45 : {
             label$46 : {
              if (!(HEAP32[(0 + 1852 | 0) >> 2] | 0)) {
               break label$46
              }
              $4 = HEAP32[(0 + 1860 | 0) >> 2] | 0;
              break label$45;
             }
             i64toi32_i32$1 = 0;
             i64toi32_i32$0 = -1;
             HEAP32[(i64toi32_i32$1 + 1864 | 0) >> 2] = -1;
             HEAP32[(i64toi32_i32$1 + 1868 | 0) >> 2] = i64toi32_i32$0;
             i64toi32_i32$1 = 0;
             i64toi32_i32$0 = 4096;
             HEAP32[(i64toi32_i32$1 + 1856 | 0) >> 2] = 4096;
             HEAP32[(i64toi32_i32$1 + 1860 | 0) >> 2] = i64toi32_i32$0;
             HEAP32[(0 + 1852 | 0) >> 2] = (($1 + 12 | 0) & -16 | 0) ^ 1431655768 | 0;
             HEAP32[(0 + 1872 | 0) >> 2] = 0;
             HEAP32[(0 + 1824 | 0) >> 2] = 0;
             $4 = 4096;
            }
            $0 = 0;
            $6 = $3 + 47 | 0;
            $2 = $4 + $6 | 0;
            $11 = 0 - $4 | 0;
            $8 = $2 & $11 | 0;
            if ($8 >>> 0 <= $3 >>> 0) {
             break label$1
            }
            $0 = 0;
            label$47 : {
             $4 = HEAP32[(0 + 1820 | 0) >> 2] | 0;
             if (!$4) {
              break label$47
             }
             $5 = HEAP32[(0 + 1812 | 0) >> 2] | 0;
             $9 = $5 + $8 | 0;
             if ($9 >>> 0 <= $5 >>> 0) {
              break label$1
             }
             if ($9 >>> 0 > $4 >>> 0) {
              break label$1
             }
            }
            if ((HEAPU8[(0 + 1824 | 0) >> 0] | 0) & 4 | 0) {
             break label$6
            }
            label$48 : {
             label$49 : {
              label$50 : {
               $4 = HEAP32[(0 + 1404 | 0) >> 2] | 0;
               if (!$4) {
                break label$50
               }
               $0 = 1828;
               label$51 : while (1) {
                label$52 : {
                 $5 = HEAP32[$0 >> 2] | 0;
                 if ($5 >>> 0 > $4 >>> 0) {
                  break label$52
                 }
                 if (($5 + (HEAP32[($0 + 4 | 0) >> 2] | 0) | 0) >>> 0 > $4 >>> 0) {
                  break label$49
                 }
                }
                $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
                if ($0) {
                 continue label$51
                }
                break label$51;
               };
              }
              $7 = sbrk(0 | 0) | 0;
              if (($7 | 0) == (-1 | 0)) {
               break label$7
              }
              $2 = $8;
              label$53 : {
               $0 = HEAP32[(0 + 1856 | 0) >> 2] | 0;
               $4 = $0 + -1 | 0;
               if (!($4 & $7 | 0)) {
                break label$53
               }
               $2 = ($8 - $7 | 0) + (($4 + $7 | 0) & (0 - $0 | 0) | 0) | 0;
              }
              if ($2 >>> 0 <= $3 >>> 0) {
               break label$7
              }
              if ($2 >>> 0 > 2147483646 >>> 0) {
               break label$7
              }
              label$54 : {
               $0 = HEAP32[(0 + 1820 | 0) >> 2] | 0;
               if (!$0) {
                break label$54
               }
               $4 = HEAP32[(0 + 1812 | 0) >> 2] | 0;
               $5 = $4 + $2 | 0;
               if ($5 >>> 0 <= $4 >>> 0) {
                break label$7
               }
               if ($5 >>> 0 > $0 >>> 0) {
                break label$7
               }
              }
              $0 = sbrk($2 | 0) | 0;
              if (($0 | 0) != ($7 | 0)) {
               break label$48
              }
              break label$5;
             }
             $2 = ($2 - $7 | 0) & $11 | 0;
             if ($2 >>> 0 > 2147483646 >>> 0) {
              break label$7
             }
             $7 = sbrk($2 | 0) | 0;
             if (($7 | 0) == ((HEAP32[$0 >> 2] | 0) + (HEAP32[($0 + 4 | 0) >> 2] | 0) | 0 | 0)) {
              break label$8
             }
             $0 = $7;
            }
            label$55 : {
             if (($0 | 0) == (-1 | 0)) {
              break label$55
             }
             if (($3 + 48 | 0) >>> 0 <= $2 >>> 0) {
              break label$55
             }
             label$56 : {
              $4 = HEAP32[(0 + 1860 | 0) >> 2] | 0;
              $4 = (($6 - $2 | 0) + $4 | 0) & (0 - $4 | 0) | 0;
              if ($4 >>> 0 <= 2147483646 >>> 0) {
               break label$56
              }
              $7 = $0;
              break label$5;
             }
             label$57 : {
              if ((sbrk($4 | 0) | 0 | 0) == (-1 | 0)) {
               break label$57
              }
              $2 = $4 + $2 | 0;
              $7 = $0;
              break label$5;
             }
             sbrk(0 - $2 | 0 | 0) | 0;
             break label$7;
            }
            $7 = $0;
            if (($0 | 0) != (-1 | 0)) {
             break label$5
            }
            break label$7;
           }
           $8 = 0;
           break label$2;
          }
          $7 = 0;
          break label$3;
         }
         if (($7 | 0) != (-1 | 0)) {
          break label$5
         }
        }
        HEAP32[(0 + 1824 | 0) >> 2] = HEAP32[(0 + 1824 | 0) >> 2] | 0 | 4 | 0;
       }
       if ($8 >>> 0 > 2147483646 >>> 0) {
        break label$4
       }
       $7 = sbrk($8 | 0) | 0;
       $0 = sbrk(0 | 0) | 0;
       if (($7 | 0) == (-1 | 0)) {
        break label$4
       }
       if (($0 | 0) == (-1 | 0)) {
        break label$4
       }
       if ($7 >>> 0 >= $0 >>> 0) {
        break label$4
       }
       $2 = $0 - $7 | 0;
       if ($2 >>> 0 <= ($3 + 40 | 0) >>> 0) {
        break label$4
       }
      }
      $0 = (HEAP32[(0 + 1812 | 0) >> 2] | 0) + $2 | 0;
      HEAP32[(0 + 1812 | 0) >> 2] = $0;
      label$58 : {
       if ($0 >>> 0 <= (HEAP32[(0 + 1816 | 0) >> 2] | 0) >>> 0) {
        break label$58
       }
       HEAP32[(0 + 1816 | 0) >> 2] = $0;
      }
      label$59 : {
       label$60 : {
        label$61 : {
         label$62 : {
          $4 = HEAP32[(0 + 1404 | 0) >> 2] | 0;
          if (!$4) {
           break label$62
          }
          $0 = 1828;
          label$63 : while (1) {
           $5 = HEAP32[$0 >> 2] | 0;
           $8 = HEAP32[($0 + 4 | 0) >> 2] | 0;
           if (($7 | 0) == ($5 + $8 | 0 | 0)) {
            break label$61
           }
           $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
           if ($0) {
            continue label$63
           }
           break label$60;
          };
         }
         label$64 : {
          label$65 : {
           $0 = HEAP32[(0 + 1396 | 0) >> 2] | 0;
           if (!$0) {
            break label$65
           }
           if ($7 >>> 0 >= $0 >>> 0) {
            break label$64
           }
          }
          HEAP32[(0 + 1396 | 0) >> 2] = $7;
         }
         $0 = 0;
         HEAP32[(0 + 1832 | 0) >> 2] = $2;
         HEAP32[(0 + 1828 | 0) >> 2] = $7;
         HEAP32[(0 + 1412 | 0) >> 2] = -1;
         HEAP32[(0 + 1416 | 0) >> 2] = HEAP32[(0 + 1852 | 0) >> 2] | 0;
         HEAP32[(0 + 1840 | 0) >> 2] = 0;
         label$66 : while (1) {
          $4 = $0 << 3 | 0;
          $5 = $4 + 1420 | 0;
          HEAP32[($4 + 1428 | 0) >> 2] = $5;
          HEAP32[($4 + 1432 | 0) >> 2] = $5;
          $0 = $0 + 1 | 0;
          if (($0 | 0) != (32 | 0)) {
           continue label$66
          }
          break label$66;
         };
         $0 = $2 + -40 | 0;
         $4 = ($7 + 8 | 0) & 7 | 0 ? (-8 - $7 | 0) & 7 | 0 : 0;
         $5 = $0 - $4 | 0;
         HEAP32[(0 + 1392 | 0) >> 2] = $5;
         $4 = $7 + $4 | 0;
         HEAP32[(0 + 1404 | 0) >> 2] = $4;
         HEAP32[($4 + 4 | 0) >> 2] = $5 | 1 | 0;
         HEAP32[(($7 + $0 | 0) + 4 | 0) >> 2] = 40;
         HEAP32[(0 + 1408 | 0) >> 2] = HEAP32[(0 + 1868 | 0) >> 2] | 0;
         break label$59;
        }
        if ((HEAPU8[($0 + 12 | 0) >> 0] | 0) & 8 | 0) {
         break label$60
        }
        if ($4 >>> 0 < $5 >>> 0) {
         break label$60
        }
        if ($4 >>> 0 >= $7 >>> 0) {
         break label$60
        }
        HEAP32[($0 + 4 | 0) >> 2] = $8 + $2 | 0;
        $0 = ($4 + 8 | 0) & 7 | 0 ? (-8 - $4 | 0) & 7 | 0 : 0;
        $5 = $4 + $0 | 0;
        HEAP32[(0 + 1404 | 0) >> 2] = $5;
        $7 = (HEAP32[(0 + 1392 | 0) >> 2] | 0) + $2 | 0;
        $0 = $7 - $0 | 0;
        HEAP32[(0 + 1392 | 0) >> 2] = $0;
        HEAP32[($5 + 4 | 0) >> 2] = $0 | 1 | 0;
        HEAP32[(($4 + $7 | 0) + 4 | 0) >> 2] = 40;
        HEAP32[(0 + 1408 | 0) >> 2] = HEAP32[(0 + 1868 | 0) >> 2] | 0;
        break label$59;
       }
       label$67 : {
        $8 = HEAP32[(0 + 1396 | 0) >> 2] | 0;
        if ($7 >>> 0 >= $8 >>> 0) {
         break label$67
        }
        HEAP32[(0 + 1396 | 0) >> 2] = $7;
        $8 = $7;
       }
       $5 = $7 + $2 | 0;
       $0 = 1828;
       label$68 : {
        label$69 : {
         label$70 : {
          label$71 : {
           label$72 : {
            label$73 : {
             label$74 : {
              label$75 : while (1) {
               if ((HEAP32[$0 >> 2] | 0 | 0) == ($5 | 0)) {
                break label$74
               }
               $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
               if ($0) {
                continue label$75
               }
               break label$73;
              };
             }
             if (!((HEAPU8[($0 + 12 | 0) >> 0] | 0) & 8 | 0)) {
              break label$72
             }
            }
            $0 = 1828;
            label$76 : while (1) {
             label$77 : {
              $5 = HEAP32[$0 >> 2] | 0;
              if ($5 >>> 0 > $4 >>> 0) {
               break label$77
              }
              $5 = $5 + (HEAP32[($0 + 4 | 0) >> 2] | 0) | 0;
              if ($5 >>> 0 > $4 >>> 0) {
               break label$71
              }
             }
             $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
             continue label$76;
            };
           }
           HEAP32[$0 >> 2] = $7;
           HEAP32[($0 + 4 | 0) >> 2] = (HEAP32[($0 + 4 | 0) >> 2] | 0) + $2 | 0;
           $11 = $7 + (($7 + 8 | 0) & 7 | 0 ? (-8 - $7 | 0) & 7 | 0 : 0) | 0;
           HEAP32[($11 + 4 | 0) >> 2] = $3 | 3 | 0;
           $2 = $5 + (($5 + 8 | 0) & 7 | 0 ? (-8 - $5 | 0) & 7 | 0 : 0) | 0;
           $3 = $11 + $3 | 0;
           $0 = $2 - $3 | 0;
           label$78 : {
            if (($2 | 0) != ($4 | 0)) {
             break label$78
            }
            HEAP32[(0 + 1404 | 0) >> 2] = $3;
            $0 = (HEAP32[(0 + 1392 | 0) >> 2] | 0) + $0 | 0;
            HEAP32[(0 + 1392 | 0) >> 2] = $0;
            HEAP32[($3 + 4 | 0) >> 2] = $0 | 1 | 0;
            break label$69;
           }
           label$79 : {
            if (($2 | 0) != (HEAP32[(0 + 1400 | 0) >> 2] | 0 | 0)) {
             break label$79
            }
            HEAP32[(0 + 1400 | 0) >> 2] = $3;
            $0 = (HEAP32[(0 + 1388 | 0) >> 2] | 0) + $0 | 0;
            HEAP32[(0 + 1388 | 0) >> 2] = $0;
            HEAP32[($3 + 4 | 0) >> 2] = $0 | 1 | 0;
            HEAP32[($3 + $0 | 0) >> 2] = $0;
            break label$69;
           }
           label$80 : {
            $4 = HEAP32[($2 + 4 | 0) >> 2] | 0;
            if (($4 & 3 | 0 | 0) != (1 | 0)) {
             break label$80
            }
            $6 = $4 & -8 | 0;
            label$81 : {
             label$82 : {
              if ($4 >>> 0 > 255 >>> 0) {
               break label$82
              }
              $5 = HEAP32[($2 + 8 | 0) >> 2] | 0;
              $8 = $4 >>> 3 | 0;
              $7 = ($8 << 3 | 0) + 1420 | 0;
              label$83 : {
               $4 = HEAP32[($2 + 12 | 0) >> 2] | 0;
               if (($4 | 0) != ($5 | 0)) {
                break label$83
               }
               HEAP32[(0 + 1380 | 0) >> 2] = (HEAP32[(0 + 1380 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $8 | 0) | 0) | 0;
               break label$81;
              }
              HEAP32[($5 + 12 | 0) >> 2] = $4;
              HEAP32[($4 + 8 | 0) >> 2] = $5;
              break label$81;
             }
             $9 = HEAP32[($2 + 24 | 0) >> 2] | 0;
             label$84 : {
              label$85 : {
               $7 = HEAP32[($2 + 12 | 0) >> 2] | 0;
               if (($7 | 0) == ($2 | 0)) {
                break label$85
               }
               $4 = HEAP32[($2 + 8 | 0) >> 2] | 0;
               HEAP32[($4 + 12 | 0) >> 2] = $7;
               HEAP32[($7 + 8 | 0) >> 2] = $4;
               break label$84;
              }
              label$86 : {
               $4 = $2 + 20 | 0;
               $5 = HEAP32[$4 >> 2] | 0;
               if ($5) {
                break label$86
               }
               $4 = $2 + 16 | 0;
               $5 = HEAP32[$4 >> 2] | 0;
               if ($5) {
                break label$86
               }
               $7 = 0;
               break label$84;
              }
              label$87 : while (1) {
               $8 = $4;
               $7 = $5;
               $4 = $5 + 20 | 0;
               $5 = HEAP32[$4 >> 2] | 0;
               if ($5) {
                continue label$87
               }
               $4 = $7 + 16 | 0;
               $5 = HEAP32[($7 + 16 | 0) >> 2] | 0;
               if ($5) {
                continue label$87
               }
               break label$87;
              };
              HEAP32[$8 >> 2] = 0;
             }
             if (!$9) {
              break label$81
             }
             label$88 : {
              label$89 : {
               $5 = HEAP32[($2 + 28 | 0) >> 2] | 0;
               $4 = ($5 << 2 | 0) + 1684 | 0;
               if (($2 | 0) != (HEAP32[$4 >> 2] | 0 | 0)) {
                break label$89
               }
               HEAP32[$4 >> 2] = $7;
               if ($7) {
                break label$88
               }
               HEAP32[(0 + 1384 | 0) >> 2] = (HEAP32[(0 + 1384 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
               break label$81;
              }
              HEAP32[($9 + ((HEAP32[($9 + 16 | 0) >> 2] | 0 | 0) == ($2 | 0) ? 16 : 20) | 0) >> 2] = $7;
              if (!$7) {
               break label$81
              }
             }
             HEAP32[($7 + 24 | 0) >> 2] = $9;
             label$90 : {
              $4 = HEAP32[($2 + 16 | 0) >> 2] | 0;
              if (!$4) {
               break label$90
              }
              HEAP32[($7 + 16 | 0) >> 2] = $4;
              HEAP32[($4 + 24 | 0) >> 2] = $7;
             }
             $4 = HEAP32[($2 + 20 | 0) >> 2] | 0;
             if (!$4) {
              break label$81
             }
             HEAP32[($7 + 20 | 0) >> 2] = $4;
             HEAP32[($4 + 24 | 0) >> 2] = $7;
            }
            $0 = $6 + $0 | 0;
            $2 = $2 + $6 | 0;
            $4 = HEAP32[($2 + 4 | 0) >> 2] | 0;
           }
           HEAP32[($2 + 4 | 0) >> 2] = $4 & -2 | 0;
           HEAP32[($3 + 4 | 0) >> 2] = $0 | 1 | 0;
           HEAP32[($3 + $0 | 0) >> 2] = $0;
           label$91 : {
            if ($0 >>> 0 > 255 >>> 0) {
             break label$91
            }
            $4 = ($0 & -8 | 0) + 1420 | 0;
            label$92 : {
             label$93 : {
              $5 = HEAP32[(0 + 1380 | 0) >> 2] | 0;
              $0 = 1 << ($0 >>> 3 | 0) | 0;
              if ($5 & $0 | 0) {
               break label$93
              }
              HEAP32[(0 + 1380 | 0) >> 2] = $5 | $0 | 0;
              $0 = $4;
              break label$92;
             }
             $0 = HEAP32[($4 + 8 | 0) >> 2] | 0;
            }
            HEAP32[($4 + 8 | 0) >> 2] = $3;
            HEAP32[($0 + 12 | 0) >> 2] = $3;
            HEAP32[($3 + 12 | 0) >> 2] = $4;
            HEAP32[($3 + 8 | 0) >> 2] = $0;
            break label$69;
           }
           $4 = 31;
           label$94 : {
            if ($0 >>> 0 > 16777215 >>> 0) {
             break label$94
            }
            $4 = $0 >>> 8 | 0;
            $1156 = $4;
            $4 = (($4 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
            $5 = $1156 << $4 | 0;
            $1163 = $5;
            $5 = (($5 + 520192 | 0) >>> 16 | 0) & 4 | 0;
            $7 = $1163 << $5 | 0;
            $1170 = $7;
            $7 = (($7 + 245760 | 0) >>> 16 | 0) & 2 | 0;
            $4 = (($1170 << $7 | 0) >>> 15 | 0) - ($4 | $5 | 0 | $7 | 0) | 0;
            $4 = ($4 << 1 | 0 | (($0 >>> ($4 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
           }
           HEAP32[($3 + 28 | 0) >> 2] = $4;
           i64toi32_i32$1 = $3;
           i64toi32_i32$0 = 0;
           HEAP32[($3 + 16 | 0) >> 2] = 0;
           HEAP32[($3 + 20 | 0) >> 2] = i64toi32_i32$0;
           $5 = ($4 << 2 | 0) + 1684 | 0;
           label$95 : {
            label$96 : {
             $7 = HEAP32[(0 + 1384 | 0) >> 2] | 0;
             $8 = 1 << $4 | 0;
             if ($7 & $8 | 0) {
              break label$96
             }
             HEAP32[(0 + 1384 | 0) >> 2] = $7 | $8 | 0;
             HEAP32[$5 >> 2] = $3;
             HEAP32[($3 + 24 | 0) >> 2] = $5;
             break label$95;
            }
            $4 = $0 << (($4 | 0) == (31 | 0) ? 0 : 25 - ($4 >>> 1 | 0) | 0) | 0;
            $7 = HEAP32[$5 >> 2] | 0;
            label$97 : while (1) {
             $5 = $7;
             if (((HEAP32[($5 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0 | 0)) {
              break label$70
             }
             $7 = $4 >>> 29 | 0;
             $4 = $4 << 1 | 0;
             $8 = ($5 + ($7 & 4 | 0) | 0) + 16 | 0;
             $7 = HEAP32[$8 >> 2] | 0;
             if ($7) {
              continue label$97
             }
             break label$97;
            };
            HEAP32[$8 >> 2] = $3;
            HEAP32[($3 + 24 | 0) >> 2] = $5;
           }
           HEAP32[($3 + 12 | 0) >> 2] = $3;
           HEAP32[($3 + 8 | 0) >> 2] = $3;
           break label$69;
          }
          $0 = $2 + -40 | 0;
          $8 = ($7 + 8 | 0) & 7 | 0 ? (-8 - $7 | 0) & 7 | 0 : 0;
          $11 = $0 - $8 | 0;
          HEAP32[(0 + 1392 | 0) >> 2] = $11;
          $8 = $7 + $8 | 0;
          HEAP32[(0 + 1404 | 0) >> 2] = $8;
          HEAP32[($8 + 4 | 0) >> 2] = $11 | 1 | 0;
          HEAP32[(($7 + $0 | 0) + 4 | 0) >> 2] = 40;
          HEAP32[(0 + 1408 | 0) >> 2] = HEAP32[(0 + 1868 | 0) >> 2] | 0;
          $0 = ($5 + (($5 + -39 | 0) & 7 | 0 ? (39 - $5 | 0) & 7 | 0 : 0) | 0) + -47 | 0;
          $8 = $0 >>> 0 < ($4 + 16 | 0) >>> 0 ? $4 : $0;
          HEAP32[($8 + 4 | 0) >> 2] = 27;
          i64toi32_i32$2 = 0;
          i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 1836 | 0) >> 2] | 0;
          i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 1840 | 0) >> 2] | 0;
          $1292 = i64toi32_i32$0;
          i64toi32_i32$0 = $8 + 16 | 0;
          HEAP32[i64toi32_i32$0 >> 2] = $1292;
          HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
          i64toi32_i32$2 = 0;
          i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 1828 | 0) >> 2] | 0;
          i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 1832 | 0) >> 2] | 0;
          $1294 = i64toi32_i32$1;
          i64toi32_i32$1 = $8;
          HEAP32[($8 + 8 | 0) >> 2] = $1294;
          HEAP32[($8 + 12 | 0) >> 2] = i64toi32_i32$0;
          HEAP32[(0 + 1836 | 0) >> 2] = $8 + 8 | 0;
          HEAP32[(0 + 1832 | 0) >> 2] = $2;
          HEAP32[(0 + 1828 | 0) >> 2] = $7;
          HEAP32[(0 + 1840 | 0) >> 2] = 0;
          $0 = $8 + 24 | 0;
          label$98 : while (1) {
           HEAP32[($0 + 4 | 0) >> 2] = 7;
           $7 = $0 + 8 | 0;
           $0 = $0 + 4 | 0;
           if ($7 >>> 0 < $5 >>> 0) {
            continue label$98
           }
           break label$98;
          };
          if (($8 | 0) == ($4 | 0)) {
           break label$59
          }
          HEAP32[($8 + 4 | 0) >> 2] = (HEAP32[($8 + 4 | 0) >> 2] | 0) & -2 | 0;
          $7 = $8 - $4 | 0;
          HEAP32[($4 + 4 | 0) >> 2] = $7 | 1 | 0;
          HEAP32[$8 >> 2] = $7;
          label$99 : {
           if ($7 >>> 0 > 255 >>> 0) {
            break label$99
           }
           $0 = ($7 & -8 | 0) + 1420 | 0;
           label$100 : {
            label$101 : {
             $5 = HEAP32[(0 + 1380 | 0) >> 2] | 0;
             $7 = 1 << ($7 >>> 3 | 0) | 0;
             if ($5 & $7 | 0) {
              break label$101
             }
             HEAP32[(0 + 1380 | 0) >> 2] = $5 | $7 | 0;
             $5 = $0;
             break label$100;
            }
            $5 = HEAP32[($0 + 8 | 0) >> 2] | 0;
           }
           HEAP32[($0 + 8 | 0) >> 2] = $4;
           HEAP32[($5 + 12 | 0) >> 2] = $4;
           HEAP32[($4 + 12 | 0) >> 2] = $0;
           HEAP32[($4 + 8 | 0) >> 2] = $5;
           break label$59;
          }
          $0 = 31;
          label$102 : {
           if ($7 >>> 0 > 16777215 >>> 0) {
            break label$102
           }
           $0 = $7 >>> 8 | 0;
           $1354 = $0;
           $0 = (($0 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
           $5 = $1354 << $0 | 0;
           $1361 = $5;
           $5 = (($5 + 520192 | 0) >>> 16 | 0) & 4 | 0;
           $8 = $1361 << $5 | 0;
           $1368 = $8;
           $8 = (($8 + 245760 | 0) >>> 16 | 0) & 2 | 0;
           $0 = (($1368 << $8 | 0) >>> 15 | 0) - ($0 | $5 | 0 | $8 | 0) | 0;
           $0 = ($0 << 1 | 0 | (($7 >>> ($0 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
          }
          HEAP32[($4 + 28 | 0) >> 2] = $0;
          i64toi32_i32$1 = $4;
          i64toi32_i32$0 = 0;
          HEAP32[($4 + 16 | 0) >> 2] = 0;
          HEAP32[($4 + 20 | 0) >> 2] = i64toi32_i32$0;
          $5 = ($0 << 2 | 0) + 1684 | 0;
          label$103 : {
           label$104 : {
            $8 = HEAP32[(0 + 1384 | 0) >> 2] | 0;
            $2 = 1 << $0 | 0;
            if ($8 & $2 | 0) {
             break label$104
            }
            HEAP32[(0 + 1384 | 0) >> 2] = $8 | $2 | 0;
            HEAP32[$5 >> 2] = $4;
            HEAP32[($4 + 24 | 0) >> 2] = $5;
            break label$103;
           }
           $0 = $7 << (($0 | 0) == (31 | 0) ? 0 : 25 - ($0 >>> 1 | 0) | 0) | 0;
           $8 = HEAP32[$5 >> 2] | 0;
           label$105 : while (1) {
            $5 = $8;
            if (((HEAP32[($5 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($7 | 0)) {
             break label$68
            }
            $8 = $0 >>> 29 | 0;
            $0 = $0 << 1 | 0;
            $2 = ($5 + ($8 & 4 | 0) | 0) + 16 | 0;
            $8 = HEAP32[$2 >> 2] | 0;
            if ($8) {
             continue label$105
            }
            break label$105;
           };
           HEAP32[$2 >> 2] = $4;
           HEAP32[($4 + 24 | 0) >> 2] = $5;
          }
          HEAP32[($4 + 12 | 0) >> 2] = $4;
          HEAP32[($4 + 8 | 0) >> 2] = $4;
          break label$59;
         }
         $0 = HEAP32[($5 + 8 | 0) >> 2] | 0;
         HEAP32[($0 + 12 | 0) >> 2] = $3;
         HEAP32[($5 + 8 | 0) >> 2] = $3;
         HEAP32[($3 + 24 | 0) >> 2] = 0;
         HEAP32[($3 + 12 | 0) >> 2] = $5;
         HEAP32[($3 + 8 | 0) >> 2] = $0;
        }
        $0 = $11 + 8 | 0;
        break label$1;
       }
       $0 = HEAP32[($5 + 8 | 0) >> 2] | 0;
       HEAP32[($0 + 12 | 0) >> 2] = $4;
       HEAP32[($5 + 8 | 0) >> 2] = $4;
       HEAP32[($4 + 24 | 0) >> 2] = 0;
       HEAP32[($4 + 12 | 0) >> 2] = $5;
       HEAP32[($4 + 8 | 0) >> 2] = $0;
      }
      $0 = HEAP32[(0 + 1392 | 0) >> 2] | 0;
      if ($0 >>> 0 <= $3 >>> 0) {
       break label$4
      }
      $4 = $0 - $3 | 0;
      HEAP32[(0 + 1392 | 0) >> 2] = $4;
      $0 = HEAP32[(0 + 1404 | 0) >> 2] | 0;
      $5 = $0 + $3 | 0;
      HEAP32[(0 + 1404 | 0) >> 2] = $5;
      HEAP32[($5 + 4 | 0) >> 2] = $4 | 1 | 0;
      HEAP32[($0 + 4 | 0) >> 2] = $3 | 3 | 0;
      $0 = $0 + 8 | 0;
      break label$1;
     }
     HEAP32[(__errno_location() | 0) >> 2] = 48;
     $0 = 0;
     break label$1;
    }
    label$106 : {
     if (!$11) {
      break label$106
     }
     label$107 : {
      label$108 : {
       $5 = HEAP32[($8 + 28 | 0) >> 2] | 0;
       $0 = ($5 << 2 | 0) + 1684 | 0;
       if (($8 | 0) != (HEAP32[$0 >> 2] | 0 | 0)) {
        break label$108
       }
       HEAP32[$0 >> 2] = $7;
       if ($7) {
        break label$107
       }
       $6 = $6 & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
       HEAP32[(0 + 1384 | 0) >> 2] = $6;
       break label$106;
      }
      HEAP32[($11 + ((HEAP32[($11 + 16 | 0) >> 2] | 0 | 0) == ($8 | 0) ? 16 : 20) | 0) >> 2] = $7;
      if (!$7) {
       break label$106
      }
     }
     HEAP32[($7 + 24 | 0) >> 2] = $11;
     label$109 : {
      $0 = HEAP32[($8 + 16 | 0) >> 2] | 0;
      if (!$0) {
       break label$109
      }
      HEAP32[($7 + 16 | 0) >> 2] = $0;
      HEAP32[($0 + 24 | 0) >> 2] = $7;
     }
     $0 = HEAP32[($8 + 20 | 0) >> 2] | 0;
     if (!$0) {
      break label$106
     }
     HEAP32[($7 + 20 | 0) >> 2] = $0;
     HEAP32[($0 + 24 | 0) >> 2] = $7;
    }
    label$110 : {
     label$111 : {
      if ($4 >>> 0 > 15 >>> 0) {
       break label$111
      }
      $0 = $4 + $3 | 0;
      HEAP32[($8 + 4 | 0) >> 2] = $0 | 3 | 0;
      $0 = $8 + $0 | 0;
      HEAP32[($0 + 4 | 0) >> 2] = HEAP32[($0 + 4 | 0) >> 2] | 0 | 1 | 0;
      break label$110;
     }
     HEAP32[($8 + 4 | 0) >> 2] = $3 | 3 | 0;
     $7 = $8 + $3 | 0;
     HEAP32[($7 + 4 | 0) >> 2] = $4 | 1 | 0;
     HEAP32[($7 + $4 | 0) >> 2] = $4;
     label$112 : {
      if ($4 >>> 0 > 255 >>> 0) {
       break label$112
      }
      $0 = ($4 & -8 | 0) + 1420 | 0;
      label$113 : {
       label$114 : {
        $5 = HEAP32[(0 + 1380 | 0) >> 2] | 0;
        $4 = 1 << ($4 >>> 3 | 0) | 0;
        if ($5 & $4 | 0) {
         break label$114
        }
        HEAP32[(0 + 1380 | 0) >> 2] = $5 | $4 | 0;
        $4 = $0;
        break label$113;
       }
       $4 = HEAP32[($0 + 8 | 0) >> 2] | 0;
      }
      HEAP32[($0 + 8 | 0) >> 2] = $7;
      HEAP32[($4 + 12 | 0) >> 2] = $7;
      HEAP32[($7 + 12 | 0) >> 2] = $0;
      HEAP32[($7 + 8 | 0) >> 2] = $4;
      break label$110;
     }
     $0 = 31;
     label$115 : {
      if ($4 >>> 0 > 16777215 >>> 0) {
       break label$115
      }
      $0 = $4 >>> 8 | 0;
      $1599 = $0;
      $0 = (($0 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
      $5 = $1599 << $0 | 0;
      $1606 = $5;
      $5 = (($5 + 520192 | 0) >>> 16 | 0) & 4 | 0;
      $3 = $1606 << $5 | 0;
      $1613 = $3;
      $3 = (($3 + 245760 | 0) >>> 16 | 0) & 2 | 0;
      $0 = (($1613 << $3 | 0) >>> 15 | 0) - ($0 | $5 | 0 | $3 | 0) | 0;
      $0 = ($0 << 1 | 0 | (($4 >>> ($0 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
     }
     HEAP32[($7 + 28 | 0) >> 2] = $0;
     i64toi32_i32$1 = $7;
     i64toi32_i32$0 = 0;
     HEAP32[($7 + 16 | 0) >> 2] = 0;
     HEAP32[($7 + 20 | 0) >> 2] = i64toi32_i32$0;
     $5 = ($0 << 2 | 0) + 1684 | 0;
     label$116 : {
      label$117 : {
       label$118 : {
        $3 = 1 << $0 | 0;
        if ($6 & $3 | 0) {
         break label$118
        }
        HEAP32[(0 + 1384 | 0) >> 2] = $6 | $3 | 0;
        HEAP32[$5 >> 2] = $7;
        HEAP32[($7 + 24 | 0) >> 2] = $5;
        break label$117;
       }
       $0 = $4 << (($0 | 0) == (31 | 0) ? 0 : 25 - ($0 >>> 1 | 0) | 0) | 0;
       $3 = HEAP32[$5 >> 2] | 0;
       label$119 : while (1) {
        $5 = $3;
        if (((HEAP32[($5 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($4 | 0)) {
         break label$116
        }
        $3 = $0 >>> 29 | 0;
        $0 = $0 << 1 | 0;
        $2 = ($5 + ($3 & 4 | 0) | 0) + 16 | 0;
        $3 = HEAP32[$2 >> 2] | 0;
        if ($3) {
         continue label$119
        }
        break label$119;
       };
       HEAP32[$2 >> 2] = $7;
       HEAP32[($7 + 24 | 0) >> 2] = $5;
      }
      HEAP32[($7 + 12 | 0) >> 2] = $7;
      HEAP32[($7 + 8 | 0) >> 2] = $7;
      break label$110;
     }
     $0 = HEAP32[($5 + 8 | 0) >> 2] | 0;
     HEAP32[($0 + 12 | 0) >> 2] = $7;
     HEAP32[($5 + 8 | 0) >> 2] = $7;
     HEAP32[($7 + 24 | 0) >> 2] = 0;
     HEAP32[($7 + 12 | 0) >> 2] = $5;
     HEAP32[($7 + 8 | 0) >> 2] = $0;
    }
    $0 = $8 + 8 | 0;
    break label$1;
   }
   label$120 : {
    if (!$10) {
     break label$120
    }
    label$121 : {
     label$122 : {
      $5 = HEAP32[($7 + 28 | 0) >> 2] | 0;
      $0 = ($5 << 2 | 0) + 1684 | 0;
      if (($7 | 0) != (HEAP32[$0 >> 2] | 0 | 0)) {
       break label$122
      }
      HEAP32[$0 >> 2] = $8;
      if ($8) {
       break label$121
      }
      HEAP32[(0 + 1384 | 0) >> 2] = $9 & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
      break label$120;
     }
     HEAP32[($10 + ((HEAP32[($10 + 16 | 0) >> 2] | 0 | 0) == ($7 | 0) ? 16 : 20) | 0) >> 2] = $8;
     if (!$8) {
      break label$120
     }
    }
    HEAP32[($8 + 24 | 0) >> 2] = $10;
    label$123 : {
     $0 = HEAP32[($7 + 16 | 0) >> 2] | 0;
     if (!$0) {
      break label$123
     }
     HEAP32[($8 + 16 | 0) >> 2] = $0;
     HEAP32[($0 + 24 | 0) >> 2] = $8;
    }
    $0 = HEAP32[($7 + 20 | 0) >> 2] | 0;
    if (!$0) {
     break label$120
    }
    HEAP32[($8 + 20 | 0) >> 2] = $0;
    HEAP32[($0 + 24 | 0) >> 2] = $8;
   }
   label$124 : {
    label$125 : {
     if ($4 >>> 0 > 15 >>> 0) {
      break label$125
     }
     $0 = $4 + $3 | 0;
     HEAP32[($7 + 4 | 0) >> 2] = $0 | 3 | 0;
     $0 = $7 + $0 | 0;
     HEAP32[($0 + 4 | 0) >> 2] = HEAP32[($0 + 4 | 0) >> 2] | 0 | 1 | 0;
     break label$124;
    }
    HEAP32[($7 + 4 | 0) >> 2] = $3 | 3 | 0;
    $5 = $7 + $3 | 0;
    HEAP32[($5 + 4 | 0) >> 2] = $4 | 1 | 0;
    HEAP32[($5 + $4 | 0) >> 2] = $4;
    label$126 : {
     if (!$6) {
      break label$126
     }
     $3 = ($6 & -8 | 0) + 1420 | 0;
     $0 = HEAP32[(0 + 1400 | 0) >> 2] | 0;
     label$127 : {
      label$128 : {
       $8 = 1 << ($6 >>> 3 | 0) | 0;
       if ($8 & $2 | 0) {
        break label$128
       }
       HEAP32[(0 + 1380 | 0) >> 2] = $8 | $2 | 0;
       $8 = $3;
       break label$127;
      }
      $8 = HEAP32[($3 + 8 | 0) >> 2] | 0;
     }
     HEAP32[($3 + 8 | 0) >> 2] = $0;
     HEAP32[($8 + 12 | 0) >> 2] = $0;
     HEAP32[($0 + 12 | 0) >> 2] = $3;
     HEAP32[($0 + 8 | 0) >> 2] = $8;
    }
    HEAP32[(0 + 1400 | 0) >> 2] = $5;
    HEAP32[(0 + 1388 | 0) >> 2] = $4;
   }
   $0 = $7 + 8 | 0;
  }
  __stack_pointer = $1 + 16 | 0;
  return $0 | 0;
 }
 
 function dlfree($0) {
  $0 = $0 | 0;
  var $2 = 0, $6 = 0, $1 = 0, $4 = 0, $3 = 0, $5 = 0, $7 = 0, $378 = 0, $385 = 0, $392 = 0;
  label$1 : {
   if (!$0) {
    break label$1
   }
   $1 = $0 + -8 | 0;
   $2 = HEAP32[($0 + -4 | 0) >> 2] | 0;
   $0 = $2 & -8 | 0;
   $3 = $1 + $0 | 0;
   label$2 : {
    if ($2 & 1 | 0) {
     break label$2
    }
    if (!($2 & 3 | 0)) {
     break label$1
    }
    $2 = HEAP32[$1 >> 2] | 0;
    $1 = $1 - $2 | 0;
    $4 = HEAP32[(0 + 1396 | 0) >> 2] | 0;
    if ($1 >>> 0 < $4 >>> 0) {
     break label$1
    }
    $0 = $2 + $0 | 0;
    label$3 : {
     if (($1 | 0) == (HEAP32[(0 + 1400 | 0) >> 2] | 0 | 0)) {
      break label$3
     }
     label$4 : {
      if ($2 >>> 0 > 255 >>> 0) {
       break label$4
      }
      $4 = HEAP32[($1 + 8 | 0) >> 2] | 0;
      $5 = $2 >>> 3 | 0;
      $6 = ($5 << 3 | 0) + 1420 | 0;
      label$5 : {
       $2 = HEAP32[($1 + 12 | 0) >> 2] | 0;
       if (($2 | 0) != ($4 | 0)) {
        break label$5
       }
       HEAP32[(0 + 1380 | 0) >> 2] = (HEAP32[(0 + 1380 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
       break label$2;
      }
      HEAP32[($4 + 12 | 0) >> 2] = $2;
      HEAP32[($2 + 8 | 0) >> 2] = $4;
      break label$2;
     }
     $7 = HEAP32[($1 + 24 | 0) >> 2] | 0;
     label$6 : {
      label$7 : {
       $6 = HEAP32[($1 + 12 | 0) >> 2] | 0;
       if (($6 | 0) == ($1 | 0)) {
        break label$7
       }
       $2 = HEAP32[($1 + 8 | 0) >> 2] | 0;
       HEAP32[($2 + 12 | 0) >> 2] = $6;
       HEAP32[($6 + 8 | 0) >> 2] = $2;
       break label$6;
      }
      label$8 : {
       $2 = $1 + 20 | 0;
       $4 = HEAP32[$2 >> 2] | 0;
       if ($4) {
        break label$8
       }
       $2 = $1 + 16 | 0;
       $4 = HEAP32[$2 >> 2] | 0;
       if ($4) {
        break label$8
       }
       $6 = 0;
       break label$6;
      }
      label$9 : while (1) {
       $5 = $2;
       $6 = $4;
       $2 = $6 + 20 | 0;
       $4 = HEAP32[$2 >> 2] | 0;
       if ($4) {
        continue label$9
       }
       $2 = $6 + 16 | 0;
       $4 = HEAP32[($6 + 16 | 0) >> 2] | 0;
       if ($4) {
        continue label$9
       }
       break label$9;
      };
      HEAP32[$5 >> 2] = 0;
     }
     if (!$7) {
      break label$2
     }
     label$10 : {
      label$11 : {
       $4 = HEAP32[($1 + 28 | 0) >> 2] | 0;
       $2 = ($4 << 2 | 0) + 1684 | 0;
       if (($1 | 0) != (HEAP32[$2 >> 2] | 0 | 0)) {
        break label$11
       }
       HEAP32[$2 >> 2] = $6;
       if ($6) {
        break label$10
       }
       HEAP32[(0 + 1384 | 0) >> 2] = (HEAP32[(0 + 1384 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4 | 0) | 0) | 0;
       break label$2;
      }
      HEAP32[($7 + ((HEAP32[($7 + 16 | 0) >> 2] | 0 | 0) == ($1 | 0) ? 16 : 20) | 0) >> 2] = $6;
      if (!$6) {
       break label$2
      }
     }
     HEAP32[($6 + 24 | 0) >> 2] = $7;
     label$12 : {
      $2 = HEAP32[($1 + 16 | 0) >> 2] | 0;
      if (!$2) {
       break label$12
      }
      HEAP32[($6 + 16 | 0) >> 2] = $2;
      HEAP32[($2 + 24 | 0) >> 2] = $6;
     }
     $2 = HEAP32[($1 + 20 | 0) >> 2] | 0;
     if (!$2) {
      break label$2
     }
     HEAP32[($6 + 20 | 0) >> 2] = $2;
     HEAP32[($2 + 24 | 0) >> 2] = $6;
     break label$2;
    }
    $2 = HEAP32[($3 + 4 | 0) >> 2] | 0;
    if (($2 & 3 | 0 | 0) != (3 | 0)) {
     break label$2
    }
    HEAP32[(0 + 1388 | 0) >> 2] = $0;
    HEAP32[($3 + 4 | 0) >> 2] = $2 & -2 | 0;
    HEAP32[($1 + 4 | 0) >> 2] = $0 | 1 | 0;
    HEAP32[($1 + $0 | 0) >> 2] = $0;
    return;
   }
   if ($1 >>> 0 >= $3 >>> 0) {
    break label$1
   }
   $2 = HEAP32[($3 + 4 | 0) >> 2] | 0;
   if (!($2 & 1 | 0)) {
    break label$1
   }
   label$13 : {
    label$14 : {
     if ($2 & 2 | 0) {
      break label$14
     }
     label$15 : {
      if (($3 | 0) != (HEAP32[(0 + 1404 | 0) >> 2] | 0 | 0)) {
       break label$15
      }
      HEAP32[(0 + 1404 | 0) >> 2] = $1;
      $0 = (HEAP32[(0 + 1392 | 0) >> 2] | 0) + $0 | 0;
      HEAP32[(0 + 1392 | 0) >> 2] = $0;
      HEAP32[($1 + 4 | 0) >> 2] = $0 | 1 | 0;
      if (($1 | 0) != (HEAP32[(0 + 1400 | 0) >> 2] | 0 | 0)) {
       break label$1
      }
      HEAP32[(0 + 1388 | 0) >> 2] = 0;
      HEAP32[(0 + 1400 | 0) >> 2] = 0;
      return;
     }
     label$16 : {
      if (($3 | 0) != (HEAP32[(0 + 1400 | 0) >> 2] | 0 | 0)) {
       break label$16
      }
      HEAP32[(0 + 1400 | 0) >> 2] = $1;
      $0 = (HEAP32[(0 + 1388 | 0) >> 2] | 0) + $0 | 0;
      HEAP32[(0 + 1388 | 0) >> 2] = $0;
      HEAP32[($1 + 4 | 0) >> 2] = $0 | 1 | 0;
      HEAP32[($1 + $0 | 0) >> 2] = $0;
      return;
     }
     $0 = ($2 & -8 | 0) + $0 | 0;
     label$17 : {
      label$18 : {
       if ($2 >>> 0 > 255 >>> 0) {
        break label$18
       }
       $4 = HEAP32[($3 + 8 | 0) >> 2] | 0;
       $5 = $2 >>> 3 | 0;
       $6 = ($5 << 3 | 0) + 1420 | 0;
       label$19 : {
        $2 = HEAP32[($3 + 12 | 0) >> 2] | 0;
        if (($2 | 0) != ($4 | 0)) {
         break label$19
        }
        HEAP32[(0 + 1380 | 0) >> 2] = (HEAP32[(0 + 1380 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5 | 0) | 0) | 0;
        break label$17;
       }
       HEAP32[($4 + 12 | 0) >> 2] = $2;
       HEAP32[($2 + 8 | 0) >> 2] = $4;
       break label$17;
      }
      $7 = HEAP32[($3 + 24 | 0) >> 2] | 0;
      label$20 : {
       label$21 : {
        $6 = HEAP32[($3 + 12 | 0) >> 2] | 0;
        if (($6 | 0) == ($3 | 0)) {
         break label$21
        }
        $2 = HEAP32[($3 + 8 | 0) >> 2] | 0;
        HEAP32[(0 + 1396 | 0) >> 2] | 0;
        HEAP32[($2 + 12 | 0) >> 2] = $6;
        HEAP32[($6 + 8 | 0) >> 2] = $2;
        break label$20;
       }
       label$22 : {
        $2 = $3 + 20 | 0;
        $4 = HEAP32[$2 >> 2] | 0;
        if ($4) {
         break label$22
        }
        $2 = $3 + 16 | 0;
        $4 = HEAP32[$2 >> 2] | 0;
        if ($4) {
         break label$22
        }
        $6 = 0;
        break label$20;
       }
       label$23 : while (1) {
        $5 = $2;
        $6 = $4;
        $2 = $6 + 20 | 0;
        $4 = HEAP32[$2 >> 2] | 0;
        if ($4) {
         continue label$23
        }
        $2 = $6 + 16 | 0;
        $4 = HEAP32[($6 + 16 | 0) >> 2] | 0;
        if ($4) {
         continue label$23
        }
        break label$23;
       };
       HEAP32[$5 >> 2] = 0;
      }
      if (!$7) {
       break label$17
      }
      label$24 : {
       label$25 : {
        $4 = HEAP32[($3 + 28 | 0) >> 2] | 0;
        $2 = ($4 << 2 | 0) + 1684 | 0;
        if (($3 | 0) != (HEAP32[$2 >> 2] | 0 | 0)) {
         break label$25
        }
        HEAP32[$2 >> 2] = $6;
        if ($6) {
         break label$24
        }
        HEAP32[(0 + 1384 | 0) >> 2] = (HEAP32[(0 + 1384 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4 | 0) | 0) | 0;
        break label$17;
       }
       HEAP32[($7 + ((HEAP32[($7 + 16 | 0) >> 2] | 0 | 0) == ($3 | 0) ? 16 : 20) | 0) >> 2] = $6;
       if (!$6) {
        break label$17
       }
      }
      HEAP32[($6 + 24 | 0) >> 2] = $7;
      label$26 : {
       $2 = HEAP32[($3 + 16 | 0) >> 2] | 0;
       if (!$2) {
        break label$26
       }
       HEAP32[($6 + 16 | 0) >> 2] = $2;
       HEAP32[($2 + 24 | 0) >> 2] = $6;
      }
      $2 = HEAP32[($3 + 20 | 0) >> 2] | 0;
      if (!$2) {
       break label$17
      }
      HEAP32[($6 + 20 | 0) >> 2] = $2;
      HEAP32[($2 + 24 | 0) >> 2] = $6;
     }
     HEAP32[($1 + 4 | 0) >> 2] = $0 | 1 | 0;
     HEAP32[($1 + $0 | 0) >> 2] = $0;
     if (($1 | 0) != (HEAP32[(0 + 1400 | 0) >> 2] | 0 | 0)) {
      break label$13
     }
     HEAP32[(0 + 1388 | 0) >> 2] = $0;
     return;
    }
    HEAP32[($3 + 4 | 0) >> 2] = $2 & -2 | 0;
    HEAP32[($1 + 4 | 0) >> 2] = $0 | 1 | 0;
    HEAP32[($1 + $0 | 0) >> 2] = $0;
   }
   label$27 : {
    if ($0 >>> 0 > 255 >>> 0) {
     break label$27
    }
    $2 = ($0 & -8 | 0) + 1420 | 0;
    label$28 : {
     label$29 : {
      $4 = HEAP32[(0 + 1380 | 0) >> 2] | 0;
      $0 = 1 << ($0 >>> 3 | 0) | 0;
      if ($4 & $0 | 0) {
       break label$29
      }
      HEAP32[(0 + 1380 | 0) >> 2] = $4 | $0 | 0;
      $0 = $2;
      break label$28;
     }
     $0 = HEAP32[($2 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($2 + 8 | 0) >> 2] = $1;
    HEAP32[($0 + 12 | 0) >> 2] = $1;
    HEAP32[($1 + 12 | 0) >> 2] = $2;
    HEAP32[($1 + 8 | 0) >> 2] = $0;
    return;
   }
   $2 = 31;
   label$30 : {
    if ($0 >>> 0 > 16777215 >>> 0) {
     break label$30
    }
    $2 = $0 >>> 8 | 0;
    $378 = $2;
    $2 = (($2 + 1048320 | 0) >>> 16 | 0) & 8 | 0;
    $4 = $378 << $2 | 0;
    $385 = $4;
    $4 = (($4 + 520192 | 0) >>> 16 | 0) & 4 | 0;
    $6 = $385 << $4 | 0;
    $392 = $6;
    $6 = (($6 + 245760 | 0) >>> 16 | 0) & 2 | 0;
    $2 = (($392 << $6 | 0) >>> 15 | 0) - ($2 | $4 | 0 | $6 | 0) | 0;
    $2 = ($2 << 1 | 0 | (($0 >>> ($2 + 21 | 0) | 0) & 1 | 0) | 0) + 28 | 0;
   }
   HEAP32[($1 + 28 | 0) >> 2] = $2;
   HEAP32[($1 + 16 | 0) >> 2] = 0;
   HEAP32[($1 + 20 | 0) >> 2] = 0;
   $4 = ($2 << 2 | 0) + 1684 | 0;
   label$31 : {
    label$32 : {
     label$33 : {
      label$34 : {
       $6 = HEAP32[(0 + 1384 | 0) >> 2] | 0;
       $3 = 1 << $2 | 0;
       if ($6 & $3 | 0) {
        break label$34
       }
       HEAP32[(0 + 1384 | 0) >> 2] = $6 | $3 | 0;
       HEAP32[$4 >> 2] = $1;
       HEAP32[($1 + 24 | 0) >> 2] = $4;
       break label$33;
      }
      $2 = $0 << (($2 | 0) == (31 | 0) ? 0 : 25 - ($2 >>> 1 | 0) | 0) | 0;
      $6 = HEAP32[$4 >> 2] | 0;
      label$35 : while (1) {
       $4 = $6;
       if (((HEAP32[($6 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0 | 0)) {
        break label$32
       }
       $6 = $2 >>> 29 | 0;
       $2 = $2 << 1 | 0;
       $3 = ($4 + ($6 & 4 | 0) | 0) + 16 | 0;
       $6 = HEAP32[$3 >> 2] | 0;
       if ($6) {
        continue label$35
       }
       break label$35;
      };
      HEAP32[$3 >> 2] = $1;
      HEAP32[($1 + 24 | 0) >> 2] = $4;
     }
     HEAP32[($1 + 12 | 0) >> 2] = $1;
     HEAP32[($1 + 8 | 0) >> 2] = $1;
     break label$31;
    }
    $0 = HEAP32[($4 + 8 | 0) >> 2] | 0;
    HEAP32[($0 + 12 | 0) >> 2] = $1;
    HEAP32[($4 + 8 | 0) >> 2] = $1;
    HEAP32[($1 + 24 | 0) >> 2] = 0;
    HEAP32[($1 + 12 | 0) >> 2] = $4;
    HEAP32[($1 + 8 | 0) >> 2] = $0;
   }
   $1 = (HEAP32[(0 + 1412 | 0) >> 2] | 0) + -1 | 0;
   HEAP32[(0 + 1412 | 0) >> 2] = $1 ? $1 : -1;
  }
 }
 
 function emscripten_get_heap_size() {
  return __wasm_memory_size() << 16 | 0 | 0;
 }
 
 function sbrk($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0;
  $1 = HEAP32[(0 + 1372 | 0) >> 2] | 0;
  $2 = ($0 + 3 | 0) & -4 | 0;
  $0 = $1 + $2 | 0;
  label$1 : {
   label$2 : {
    if (!$2) {
     break label$2
    }
    if ($0 >>> 0 <= $1 >>> 0) {
     break label$1
    }
   }
   label$3 : {
    if ($0 >>> 0 <= (emscripten_get_heap_size() | 0) >>> 0) {
     break label$3
    }
    if (!(emscripten_resize_heap($0 | 0) | 0)) {
     break label$1
    }
   }
   HEAP32[(0 + 1372 | 0) >> 2] = $0;
   return $1 | 0;
  }
  HEAP32[(__errno_location() | 0) >> 2] = 48;
  return -1 | 0;
 }
 
 function setThrew($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  label$1 : {
   if (HEAP32[(0 + 1876 | 0) >> 2] | 0) {
    break label$1
   }
   HEAP32[(0 + 1880 | 0) >> 2] = $1;
   HEAP32[(0 + 1876 | 0) >> 2] = $0;
  }
 }
 
 function operator_20delete_28void__29($0) {
  $0 = $0 | 0;
  dlfree($0 | 0);
 }
 
 function strcmp($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $3 = 0, $2 = 0;
  $2 = HEAPU8[$1 >> 0] | 0;
  label$1 : {
   $3 = HEAPU8[$0 >> 0] | 0;
   if (!$3) {
    break label$1
   }
   if (($3 | 0) != ($2 & 255 | 0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $2 = HEAPU8[($1 + 1 | 0) >> 0] | 0;
    $3 = HEAPU8[($0 + 1 | 0) >> 0] | 0;
    if (!$3) {
     break label$1
    }
    $1 = $1 + 1 | 0;
    $0 = $0 + 1 | 0;
    if (($3 | 0) == ($2 & 255 | 0 | 0)) {
     continue label$2
    }
    break label$2;
   };
  }
  return $3 - ($2 & 255 | 0) | 0 | 0;
 }
 
 function __cxxabiv1____shim_type_info_____shim_type_info_28_29($0) {
  $0 = $0 | 0;
  return std__type_info___type_info_28_29($0 | 0) | 0 | 0;
 }
 
 function __cxxabiv1____shim_type_info__noop1_28_29_20const($0) {
  $0 = $0 | 0;
 }
 
 function __cxxabiv1____shim_type_info__noop2_28_29_20const($0) {
  $0 = $0 | 0;
 }
 
 function __cxxabiv1____class_type_info_____class_type_info_28_29($0) {
  $0 = $0 | 0;
  operator_20delete_28void__29(__cxxabiv1____shim_type_info_____shim_type_info_28_29($0 | 0) | 0 | 0);
 }
 
 function __cxxabiv1____si_class_type_info_____si_class_type_info_28_29($0) {
  $0 = $0 | 0;
  operator_20delete_28void__29(__cxxabiv1____shim_type_info_____shim_type_info_28_29($0 | 0) | 0 | 0);
 }
 
 function is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  label$1 : {
   if ($2) {
    break label$1
   }
   return (HEAP32[($0 + 4 | 0) >> 2] | 0 | 0) == (HEAP32[($1 + 4 | 0) >> 2] | 0 | 0) | 0;
  }
  label$2 : {
   if (($0 | 0) != ($1 | 0)) {
    break label$2
   }
   return 1 | 0;
  }
  return !(strcmp(std__type_info__name_28_29_20const($0 | 0) | 0 | 0, std__type_info__name_28_29_20const($1 | 0) | 0 | 0) | 0) | 0;
 }
 
 function std__type_info__name_28_29_20const($0) {
  $0 = $0 | 0;
  return HEAP32[($0 + 4 | 0) >> 2] | 0 | 0;
 }
 
 function __cxxabiv1____class_type_info__can_catch_28__cxxabiv1____shim_type_info_20const__2c_20void___29_20const($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  var $3 = 0, $4 = 0;
  $3 = __stack_pointer - 64 | 0;
  __stack_pointer = $3;
  $4 = 1;
  label$1 : {
   if (is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, $1 | 0, 0 | 0) | 0) {
    break label$1
   }
   $4 = 0;
   if (!$1) {
    break label$1
   }
   $4 = 0;
   $1 = __dynamic_cast($1 | 0, 1060 | 0, 1108 | 0, 0 | 0) | 0;
   if (!$1) {
    break label$1
   }
   memset($3 + 8 | 0 | 4 | 0 | 0, 0 | 0, 52 | 0) | 0;
   HEAP32[($3 + 56 | 0) >> 2] = 1;
   HEAP32[($3 + 20 | 0) >> 2] = -1;
   HEAP32[($3 + 16 | 0) >> 2] = $0;
   HEAP32[($3 + 8 | 0) >> 2] = $1;
   FUNCTION_TABLE[HEAP32[((HEAP32[$1 >> 2] | 0) + 28 | 0) >> 2] | 0 | 0]($1, $3 + 8 | 0, HEAP32[$2 >> 2] | 0, 1);
   label$2 : {
    $4 = HEAP32[($3 + 32 | 0) >> 2] | 0;
    if (($4 | 0) != (1 | 0)) {
     break label$2
    }
    HEAP32[$2 >> 2] = HEAP32[($3 + 24 | 0) >> 2] | 0;
   }
   $4 = ($4 | 0) == (1 | 0);
  }
  __stack_pointer = $3 + 64 | 0;
  return $4 | 0;
 }
 
 function __dynamic_cast($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $6 = 0, $5 = 0, $9 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0, wasm2js_i32$2 = 0, wasm2js_i32$3 = 0, wasm2js_i32$4 = 0, wasm2js_i32$5 = 0, wasm2js_i32$6 = 0, wasm2js_i32$7 = 0, wasm2js_i32$8 = 0;
  $4 = __stack_pointer - 64 | 0;
  __stack_pointer = $4;
  $5 = HEAP32[$0 >> 2] | 0;
  $6 = HEAP32[($5 + -4 | 0) >> 2] | 0;
  $5 = HEAP32[($5 + -8 | 0) >> 2] | 0;
  i64toi32_i32$1 = $4 + 32 | 0;
  i64toi32_i32$0 = 0;
  HEAP32[i64toi32_i32$1 >> 2] = 0;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $4 + 40 | 0;
  i64toi32_i32$0 = 0;
  HEAP32[i64toi32_i32$1 >> 2] = 0;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $4 + 48 | 0;
  i64toi32_i32$0 = 0;
  HEAP32[i64toi32_i32$1 >> 2] = 0;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $4 + 55 | 0;
  i64toi32_i32$0 = 0;
  $9 = 0;
  HEAP8[i64toi32_i32$1 >> 0] = $9;
  HEAP8[(i64toi32_i32$1 + 1 | 0) >> 0] = $9 >>> 8 | 0;
  HEAP8[(i64toi32_i32$1 + 2 | 0) >> 0] = $9 >>> 16 | 0;
  HEAP8[(i64toi32_i32$1 + 3 | 0) >> 0] = $9 >>> 24 | 0;
  HEAP8[(i64toi32_i32$1 + 4 | 0) >> 0] = i64toi32_i32$0;
  HEAP8[(i64toi32_i32$1 + 5 | 0) >> 0] = i64toi32_i32$0 >>> 8 | 0;
  HEAP8[(i64toi32_i32$1 + 6 | 0) >> 0] = i64toi32_i32$0 >>> 16 | 0;
  HEAP8[(i64toi32_i32$1 + 7 | 0) >> 0] = i64toi32_i32$0 >>> 24 | 0;
  i64toi32_i32$1 = $4;
  i64toi32_i32$0 = 0;
  HEAP32[($4 + 24 | 0) >> 2] = 0;
  HEAP32[($4 + 28 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[($4 + 20 | 0) >> 2] = $3;
  HEAP32[($4 + 16 | 0) >> 2] = $1;
  HEAP32[($4 + 12 | 0) >> 2] = $0;
  HEAP32[($4 + 8 | 0) >> 2] = $2;
  $0 = $0 + $5 | 0;
  $3 = 0;
  label$1 : {
   label$2 : {
    if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($6 | 0, $2 | 0, 0 | 0) | 0)) {
     break label$2
    }
    HEAP32[($4 + 56 | 0) >> 2] = 1;
    FUNCTION_TABLE[HEAP32[((HEAP32[$6 >> 2] | 0) + 20 | 0) >> 2] | 0 | 0]($6, $4 + 8 | 0, $0, $0, 1, 0);
    $3 = (HEAP32[($4 + 32 | 0) >> 2] | 0 | 0) == (1 | 0) ? $0 : 0;
    break label$1;
   }
   FUNCTION_TABLE[HEAP32[((HEAP32[$6 >> 2] | 0) + 24 | 0) >> 2] | 0 | 0]($6, $4 + 8 | 0, $0, 1, 0);
   label$3 : {
    switch (HEAP32[($4 + 44 | 0) >> 2] | 0 | 0) {
    case 0:
     $3 = (wasm2js_i32$0 = (wasm2js_i32$3 = (wasm2js_i32$6 = HEAP32[($4 + 28 | 0) >> 2] | 0, wasm2js_i32$7 = 0, wasm2js_i32$8 = (HEAP32[($4 + 40 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$8 ? wasm2js_i32$6 : wasm2js_i32$7), wasm2js_i32$4 = 0, wasm2js_i32$5 = (HEAP32[($4 + 36 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$5 ? wasm2js_i32$3 : wasm2js_i32$4), wasm2js_i32$1 = 0, wasm2js_i32$2 = (HEAP32[($4 + 48 | 0) >> 2] | 0 | 0) == (1 | 0), wasm2js_i32$2 ? wasm2js_i32$0 : wasm2js_i32$1);
     break label$1;
    case 1:
     break label$3;
    default:
     break label$1;
    };
   }
   label$5 : {
    if ((HEAP32[($4 + 32 | 0) >> 2] | 0 | 0) == (1 | 0)) {
     break label$5
    }
    if (HEAP32[($4 + 48 | 0) >> 2] | 0) {
     break label$1
    }
    if ((HEAP32[($4 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$1
    }
    if ((HEAP32[($4 + 40 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$1
    }
   }
   $3 = HEAP32[($4 + 24 | 0) >> 2] | 0;
  }
  __stack_pointer = $4 + 64 | 0;
  return $3 | 0;
 }
 
 function __cxxabiv1____class_type_info__process_found_base_class_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  var $4 = 0;
  label$1 : {
   $4 = HEAP32[($1 + 16 | 0) >> 2] | 0;
   if ($4) {
    break label$1
   }
   HEAP32[($1 + 36 | 0) >> 2] = 1;
   HEAP32[($1 + 24 | 0) >> 2] = $3;
   HEAP32[($1 + 16 | 0) >> 2] = $2;
   return;
  }
  label$2 : {
   label$3 : {
    if (($4 | 0) != ($2 | 0)) {
     break label$3
    }
    if ((HEAP32[($1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$2
    }
    HEAP32[($1 + 24 | 0) >> 2] = $3;
    return;
   }
   HEAP8[($1 + 54 | 0) >> 0] = 1;
   HEAP32[($1 + 24 | 0) >> 2] = 2;
   HEAP32[($1 + 36 | 0) >> 2] = (HEAP32[($1 + 36 | 0) >> 2] | 0) + 1 | 0;
  }
 }
 
 function __cxxabiv1____class_type_info__has_unambiguous_public_base_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_found_base_class_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0);
  }
 }
 
 function __cxxabiv1____si_class_type_info__has_unambiguous_public_base_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, 0 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_found_base_class_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0);
   return;
  }
  $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
  FUNCTION_TABLE[HEAP32[((HEAP32[$0 >> 2] | 0) + 28 | 0) >> 2] | 0 | 0]($0, $1, $2, $3);
 }
 
 function __cxxabiv1____class_type_info__process_static_type_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_29_20const($0, $1, $2, $3, $4) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  $4 = $4 | 0;
  HEAP8[($1 + 53 | 0) >> 0] = 1;
  label$1 : {
   if ((HEAP32[($1 + 4 | 0) >> 2] | 0 | 0) != ($3 | 0)) {
    break label$1
   }
   HEAP8[($1 + 52 | 0) >> 0] = 1;
   label$2 : {
    label$3 : {
     $3 = HEAP32[($1 + 16 | 0) >> 2] | 0;
     if ($3) {
      break label$3
     }
     HEAP32[($1 + 36 | 0) >> 2] = 1;
     HEAP32[($1 + 24 | 0) >> 2] = $4;
     HEAP32[($1 + 16 | 0) >> 2] = $2;
     if (($4 | 0) != (1 | 0)) {
      break label$1
     }
     if ((HEAP32[($1 + 48 | 0) >> 2] | 0 | 0) == (1 | 0)) {
      break label$2
     }
     break label$1;
    }
    label$4 : {
     if (($3 | 0) != ($2 | 0)) {
      break label$4
     }
     label$5 : {
      $3 = HEAP32[($1 + 24 | 0) >> 2] | 0;
      if (($3 | 0) != (2 | 0)) {
       break label$5
      }
      HEAP32[($1 + 24 | 0) >> 2] = $4;
      $3 = $4;
     }
     if ((HEAP32[($1 + 48 | 0) >> 2] | 0 | 0) != (1 | 0)) {
      break label$1
     }
     if (($3 | 0) == (1 | 0)) {
      break label$2
     }
     break label$1;
    }
    HEAP32[($1 + 36 | 0) >> 2] = (HEAP32[($1 + 36 | 0) >> 2] | 0) + 1 | 0;
   }
   HEAP8[($1 + 54 | 0) >> 0] = 1;
  }
 }
 
 function __cxxabiv1____class_type_info__process_static_type_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_29_20const($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  label$1 : {
   if ((HEAP32[($1 + 4 | 0) >> 2] | 0 | 0) != ($2 | 0)) {
    break label$1
   }
   if ((HEAP32[($1 + 28 | 0) >> 2] | 0 | 0) == (1 | 0)) {
    break label$1
   }
   HEAP32[($1 + 28 | 0) >> 2] = $3;
  }
 }
 
 function __cxxabiv1____si_class_type_info__search_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_2c_20bool_29_20const($0, $1, $2, $3, $4) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  $4 = $4 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, $4 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_static_type_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0);
   return;
  }
  label$2 : {
   label$3 : {
    if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[$1 >> 2] | 0 | 0, $4 | 0) | 0)) {
     break label$3
    }
    label$4 : {
     label$5 : {
      if ((HEAP32[($1 + 16 | 0) >> 2] | 0 | 0) == ($2 | 0)) {
       break label$5
      }
      if ((HEAP32[($1 + 20 | 0) >> 2] | 0 | 0) != ($2 | 0)) {
       break label$4
      }
     }
     if (($3 | 0) != (1 | 0)) {
      break label$2
     }
     HEAP32[($1 + 32 | 0) >> 2] = 1;
     return;
    }
    HEAP32[($1 + 32 | 0) >> 2] = $3;
    label$6 : {
     if ((HEAP32[($1 + 44 | 0) >> 2] | 0 | 0) == (4 | 0)) {
      break label$6
     }
     HEAP16[($1 + 52 | 0) >> 1] = 0;
     $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
     FUNCTION_TABLE[HEAP32[((HEAP32[$0 >> 2] | 0) + 20 | 0) >> 2] | 0 | 0]($0, $1, $2, $2, 1, $4);
     label$7 : {
      if (!(HEAPU8[($1 + 53 | 0) >> 0] | 0)) {
       break label$7
      }
      HEAP32[($1 + 44 | 0) >> 2] = 3;
      if (!(HEAPU8[($1 + 52 | 0) >> 0] | 0)) {
       break label$6
      }
      break label$2;
     }
     HEAP32[($1 + 44 | 0) >> 2] = 4;
    }
    HEAP32[($1 + 20 | 0) >> 2] = $2;
    HEAP32[($1 + 40 | 0) >> 2] = (HEAP32[($1 + 40 | 0) >> 2] | 0) + 1 | 0;
    if ((HEAP32[($1 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$2
    }
    if ((HEAP32[($1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$2
    }
    HEAP8[($1 + 54 | 0) >> 0] = 1;
    return;
   }
   $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
   FUNCTION_TABLE[HEAP32[((HEAP32[$0 >> 2] | 0) + 24 | 0) >> 2] | 0 | 0]($0, $1, $2, $3, $4);
  }
 }
 
 function __cxxabiv1____class_type_info__search_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_2c_20bool_29_20const($0, $1, $2, $3, $4) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  $4 = $4 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, $4 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_static_type_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0);
   return;
  }
  label$2 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[$1 >> 2] | 0 | 0, $4 | 0) | 0)) {
    break label$2
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($1 + 16 | 0) >> 2] | 0 | 0) == ($2 | 0)) {
      break label$4
     }
     if ((HEAP32[($1 + 20 | 0) >> 2] | 0 | 0) != ($2 | 0)) {
      break label$3
     }
    }
    if (($3 | 0) != (1 | 0)) {
     break label$2
    }
    HEAP32[($1 + 32 | 0) >> 2] = 1;
    return;
   }
   HEAP32[($1 + 20 | 0) >> 2] = $2;
   HEAP32[($1 + 32 | 0) >> 2] = $3;
   HEAP32[($1 + 40 | 0) >> 2] = (HEAP32[($1 + 40 | 0) >> 2] | 0) + 1 | 0;
   label$5 : {
    if ((HEAP32[($1 + 36 | 0) >> 2] | 0 | 0) != (1 | 0)) {
     break label$5
    }
    if ((HEAP32[($1 + 24 | 0) >> 2] | 0 | 0) != (2 | 0)) {
     break label$5
    }
    HEAP8[($1 + 54 | 0) >> 0] = 1;
   }
   HEAP32[($1 + 44 | 0) >> 2] = 4;
  }
 }
 
 function __cxxabiv1____si_class_type_info__search_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_2c_20bool_29_20const($0, $1, $2, $3, $4, $5) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  $4 = $4 | 0;
  $5 = $5 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, $5 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_static_type_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0, $4 | 0);
   return;
  }
  $0 = HEAP32[($0 + 8 | 0) >> 2] | 0;
  FUNCTION_TABLE[HEAP32[((HEAP32[$0 >> 2] | 0) + 20 | 0) >> 2] | 0 | 0]($0, $1, $2, $3, $4, $5);
 }
 
 function __cxxabiv1____class_type_info__search_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_2c_20bool_29_20const($0, $1, $2, $3, $4, $5) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
  $4 = $4 | 0;
  $5 = $5 | 0;
  label$1 : {
   if (!(is_equal_28std__type_info_20const__2c_20std__type_info_20const__2c_20bool_29($0 | 0, HEAP32[($1 + 8 | 0) >> 2] | 0 | 0, $5 | 0) | 0)) {
    break label$1
   }
   __cxxabiv1____class_type_info__process_static_type_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_29_20const($1 | 0, $1 | 0, $2 | 0, $3 | 0, $4 | 0);
  }
 }
 
 function __cxa_can_catch($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  var $3 = 0;
  $3 = __stack_pointer - 16 | 0;
  __stack_pointer = $3;
  HEAP32[($3 + 12 | 0) >> 2] = HEAP32[$2 >> 2] | 0;
  label$1 : {
   $0 = FUNCTION_TABLE[HEAP32[((HEAP32[$0 >> 2] | 0) + 16 | 0) >> 2] | 0 | 0]($0, $1, $3 + 12 | 0) | 0;
   if (!$0) {
    break label$1
   }
   HEAP32[$2 >> 2] = HEAP32[($3 + 12 | 0) >> 2] | 0;
  }
  __stack_pointer = $3 + 16 | 0;
  return $0 | 0;
 }
 
 function __cxa_is_pointer_type($0) {
  $0 = $0 | 0;
  label$1 : {
   if ($0) {
    break label$1
   }
   return 0 | 0;
  }
  return (__dynamic_cast($0 | 0, 1060 | 0, 1204 | 0, 0 | 0) | 0 | 0) != (0 | 0) | 0;
 }
 
 function std__type_info___type_info_28_29($0) {
  $0 = $0 | 0;
  return $0 | 0;
 }
 
 function stackSave() {
  return __stack_pointer | 0;
 }
 
 function stackRestore($0) {
  $0 = $0 | 0;
  __stack_pointer = $0;
 }
 
 function stackAlloc($0) {
  $0 = $0 | 0;
  var $1 = 0;
  $1 = (__stack_pointer - $0 | 0) & -16 | 0;
  __stack_pointer = $1;
  return $1 | 0;
 }
 
 function emscripten_stack_init() {
  __stack_base = 5244784;
  __stack_end = (1896 + 15 | 0) & -16 | 0;
 }
 
 function emscripten_stack_get_free() {
  return __stack_pointer - __stack_end | 0 | 0;
 }
 
 function emscripten_stack_get_base() {
  return __stack_base | 0;
 }
 
 function emscripten_stack_get_end() {
  return __stack_end | 0;
 }
 
 function htonl($0) {
  $0 = $0 | 0;
  return __bswap_32($0 | 0) | 0 | 0;
 }
 
 function __bswap_32($0) {
  $0 = $0 | 0;
  return $0 << 24 | 0 | (($0 << 8 | 0) & 16711680 | 0) | 0 | (($0 >>> 8 | 0) & 65280 | 0 | ($0 >>> 24 | 0) | 0) | 0 | 0;
 }
 
 function __ofl_lock() {
  __lock(1884 | 0);
  return 1888 | 0;
 }
 
 function __ofl_unlock() {
  __unlock(1884 | 0);
 }
 
 function __lockfile($0) {
  $0 = $0 | 0;
  return 1 | 0;
 }
 
 function __unlockfile($0) {
  $0 = $0 | 0;
 }
 
 function fflush($0) {
  $0 = $0 | 0;
  var $1 = 0, i64toi32_i32$1 = 0, $2 = 0, i64toi32_i32$0 = 0, $3 = 0;
  label$1 : {
   if ($0) {
    break label$1
   }
   $1 = 0;
   label$2 : {
    if (!(HEAP32[(0 + 1892 | 0) >> 2] | 0)) {
     break label$2
    }
    $1 = fflush(HEAP32[(0 + 1892 | 0) >> 2] | 0 | 0) | 0;
   }
   label$3 : {
    if (!(HEAP32[(0 + 1892 | 0) >> 2] | 0)) {
     break label$3
    }
    $1 = fflush(HEAP32[(0 + 1892 | 0) >> 2] | 0 | 0) | 0 | $1 | 0;
   }
   label$4 : {
    $0 = HEAP32[(__ofl_lock() | 0) >> 2] | 0;
    if (!$0) {
     break label$4
    }
    label$5 : while (1) {
     $2 = 0;
     label$6 : {
      if ((HEAP32[($0 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
       break label$6
      }
      $2 = __lockfile($0 | 0) | 0;
     }
     label$7 : {
      if ((HEAP32[($0 + 20 | 0) >> 2] | 0 | 0) == (HEAP32[($0 + 28 | 0) >> 2] | 0 | 0)) {
       break label$7
      }
      $1 = fflush($0 | 0) | 0 | $1 | 0;
     }
     label$8 : {
      if (!$2) {
       break label$8
      }
      __unlockfile($0 | 0);
     }
     $0 = HEAP32[($0 + 56 | 0) >> 2] | 0;
     if ($0) {
      continue label$5
     }
     break label$5;
    };
   }
   __ofl_unlock();
   return $1 | 0;
  }
  $2 = 0;
  label$9 : {
   if ((HEAP32[($0 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
    break label$9
   }
   $2 = __lockfile($0 | 0) | 0;
  }
  label$10 : {
   label$11 : {
    label$12 : {
     if ((HEAP32[($0 + 20 | 0) >> 2] | 0 | 0) == (HEAP32[($0 + 28 | 0) >> 2] | 0 | 0)) {
      break label$12
     }
     FUNCTION_TABLE[HEAP32[($0 + 36 | 0) >> 2] | 0 | 0]($0, 0, 0) | 0;
     if (HEAP32[($0 + 20 | 0) >> 2] | 0) {
      break label$12
     }
     $1 = -1;
     if ($2) {
      break label$11
     }
     break label$10;
    }
    label$13 : {
     $1 = HEAP32[($0 + 4 | 0) >> 2] | 0;
     $3 = HEAP32[($0 + 8 | 0) >> 2] | 0;
     if (($1 | 0) == ($3 | 0)) {
      break label$13
     }
     i64toi32_i32$1 = $1 - $3 | 0;
     i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
     i64toi32_i32$0 = FUNCTION_TABLE[HEAP32[($0 + 40 | 0) >> 2] | 0 | 0]($0, i64toi32_i32$1, i64toi32_i32$0, 1) | 0;
     i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    }
    $1 = 0;
    HEAP32[($0 + 28 | 0) >> 2] = 0;
    i64toi32_i32$0 = $0;
    i64toi32_i32$1 = 0;
    HEAP32[($0 + 16 | 0) >> 2] = 0;
    HEAP32[($0 + 20 | 0) >> 2] = i64toi32_i32$1;
    i64toi32_i32$0 = $0;
    i64toi32_i32$1 = 0;
    HEAP32[($0 + 4 | 0) >> 2] = 0;
    HEAP32[($0 + 8 | 0) >> 2] = i64toi32_i32$1;
    if (!$2) {
     break label$10
    }
   }
   __unlockfile($0 | 0);
  }
  return $1 | 0;
 }
 
 function ntohs($0) {
  $0 = $0 | 0;
  return __bswap_16($0 | 0) | 0 | 0;
 }
 
 function __bswap_16($0) {
  $0 = $0 | 0;
  return ($0 << 8 | 0 | ($0 >>> 8 | 0) | 0) & 65535 | 0 | 0;
 }
 
 function htons($0) {
  $0 = $0 | 0;
  return __bswap_16_1($0 | 0) | 0 | 0;
 }
 
 function __bswap_16_1($0) {
  $0 = $0 | 0;
  return ($0 << 8 | 0 | ($0 >>> 8 | 0) | 0) & 65535 | 0 | 0;
 }
 
 function _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$4 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, var$2 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, var$3 = 0, var$4 = 0, var$5 = 0, $21 = 0, $22 = 0, var$6 = 0, $24 = 0, $17 = 0, $18 = 0, $23 = 0, $29 = 0, $45 = 0, $56$hi = 0, $62$hi = 0;
  i64toi32_i32$0 = var$1$hi;
  var$2 = var$1;
  var$4 = var$2 >>> 16 | 0;
  i64toi32_i32$0 = var$0$hi;
  var$3 = var$0;
  var$5 = var$3 >>> 16 | 0;
  $17 = Math_imul(var$4, var$5);
  $18 = var$2;
  i64toi32_i32$2 = var$3;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = 0;
   $21 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   $21 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
  }
  $23 = $17 + Math_imul($18, $21) | 0;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$0 = var$1;
  i64toi32_i32$2 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$2 = 0;
   $22 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
   $22 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
  }
  $29 = $23 + Math_imul($22, var$3) | 0;
  var$2 = var$2 & 65535 | 0;
  var$3 = var$3 & 65535 | 0;
  var$6 = Math_imul(var$2, var$3);
  var$2 = (var$6 >>> 16 | 0) + Math_imul(var$2, var$5) | 0;
  $45 = $29 + (var$2 >>> 16 | 0) | 0;
  var$2 = (var$2 & 65535 | 0) + Math_imul(var$4, var$3) | 0;
  i64toi32_i32$2 = 0;
  i64toi32_i32$1 = $45 + (var$2 >>> 16 | 0) | 0;
  i64toi32_i32$0 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$0 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
   $24 = 0;
  } else {
   i64toi32_i32$0 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$1 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
   $24 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
  }
  $56$hi = i64toi32_i32$0;
  i64toi32_i32$0 = 0;
  $62$hi = i64toi32_i32$0;
  i64toi32_i32$0 = $56$hi;
  i64toi32_i32$2 = $24;
  i64toi32_i32$1 = $62$hi;
  i64toi32_i32$3 = var$2 << 16 | 0 | (var$6 & 65535 | 0) | 0;
  i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
  i64toi32_i32$2 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
  return i64toi32_i32$2 | 0;
 }
 
 function __wasm_i64_mul(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$0 = var$1$hi;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$1 = _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0 | 0, i64toi32_i32$0 | 0, var$1 | 0, i64toi32_i32$1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function __wasm_rotl_i32(var$0, var$1) {
  var$0 = var$0 | 0;
  var$1 = var$1 | 0;
  var var$2 = 0;
  var$2 = var$1 & 31 | 0;
  var$1 = (0 - var$1 | 0) & 31 | 0;
  return ((-1 >>> var$2 | 0) & var$0 | 0) << var$2 | 0 | (((-1 << var$1 | 0) & var$0 | 0) >>> var$1 | 0) | 0 | 0;
 }
 
 // EMSCRIPTEN_END_FUNCS
;
 bufferView = HEAPU8;
 initActiveSegments(env);
 var FUNCTION_TABLE = Table([null, __cxxabiv1____shim_type_info_____shim_type_info_28_29, __cxxabiv1____class_type_info_____class_type_info_28_29, __cxxabiv1____shim_type_info__noop1_28_29_20const, __cxxabiv1____shim_type_info__noop2_28_29_20const, __cxxabiv1____class_type_info__can_catch_28__cxxabiv1____shim_type_info_20const__2c_20void___29_20const, __cxxabiv1____class_type_info__search_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_2c_20bool_29_20const, __cxxabiv1____class_type_info__search_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_2c_20bool_29_20const, __cxxabiv1____class_type_info__has_unambiguous_public_base_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const, __cxxabiv1____si_class_type_info_____si_class_type_info_28_29, __cxxabiv1____si_class_type_info__search_above_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20void_20const__2c_20int_2c_20bool_29_20const, __cxxabiv1____si_class_type_info__search_below_dst_28__cxxabiv1____dynamic_cast_info__2c_20void_20const__2c_20int_2c_20bool_29_20const, __cxxabiv1____si_class_type_info__has_unambiguous_public_base_28__cxxabiv1____dynamic_cast_info__2c_20void__2c_20int_29_20const]);
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 return {
  "__wasm_call_ctors": __wasm_call_ctors, 
  "__errno_location": __errno_location, 
  "malloc": dlmalloc, 
  "free": dlfree, 
  "__indirect_function_table": FUNCTION_TABLE, 
  "fflush": fflush, 
  "htonl": htonl, 
  "htons": htons, 
  "ntohs": ntohs, 
  "setThrew": setThrew, 
  "emscripten_stack_init": emscripten_stack_init, 
  "emscripten_stack_get_free": emscripten_stack_get_free, 
  "emscripten_stack_get_base": emscripten_stack_get_base, 
  "emscripten_stack_get_end": emscripten_stack_get_end, 
  "stackSave": stackSave, 
  "stackRestore": stackRestore, 
  "stackAlloc": stackAlloc, 
  "__cxa_can_catch": __cxa_can_catch, 
  "__cxa_is_pointer_type": __cxa_is_pointer_type
 };
}

  return asmFunc(asmLibraryArg);
}

)(asmLibraryArg);
  },

  instantiate: /** @suppress{checkTypes} */ function(binary, info) {
    return {
      then: function(ok) {
        var module = new WebAssembly.Module(binary);
        ok({
          'instance': new WebAssembly.Instance(module)
        });
        // Emulate a simple WebAssembly.instantiate(..).then(()=>{}).catch(()=>{}) syntax.
        return { catch: function() {} };
      }
    };
  },

  RuntimeError: Error
};

// We don't need to actually download a wasm binary, mark it as present but empty.
wasmBinary = [];

// end include: wasm2js.js
if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

// include: runtime_strings.js


// runtime_strings.js: Strings related runtime functions that are part of both MINIMAL_RUNTIME and regular runtime.

var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.
/**
 * heapOrArray is either a regular array, or a JavaScript typed array view.
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = '';
  // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }

    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   heap: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 0xC0 | (u >> 6);
      heap[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 0xE0 | (u >> 12);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u > 0x10FFFF) warnOnce('Invalid Unicode code point 0x' + u.toString(16) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
      heap[outIdx++] = 0xF0 | (u >> 18);
      heap[outIdx++] = 0x80 | ((u >> 12) & 63);
      heap[outIdx++] = 0x80 | ((u >> 6) & 63);
      heap[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i); // possibly a lead surrogate
    if (c <= 0x7F) {
      len++;
    } else if (c <= 0x7FF) {
      len += 2;
    } else if (c >= 0xD800 && c <= 0xDFFF) {
      len += 4; ++i;
    } else {
      len += 3;
    }
  }
  return len;
}

// end include: runtime_strings.js
// Memory management

var HEAP,
/** @type {!ArrayBuffer} */
  buffer,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}

var TOTAL_STACK = 5242880;
if (Module['TOTAL_STACK']) assert(TOTAL_STACK === Module['TOTAL_STACK'], 'the stack size can no longer be determined at runtime')

var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;legacyModuleProp('INITIAL_MEMORY', 'INITIAL_MEMORY');

assert(INITIAL_MEMORY >= TOTAL_STACK, 'INITIAL_MEMORY should be larger than TOTAL_STACK, was ' + INITIAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// In non-standalone/normal mode, we create the memory here.
// include: runtime_init_memory.js


// Create the wasm memory. (Note: this only applies if IMPORTED_MEMORY is defined)

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_MEMORY / 65536,
      'maximum': INITIAL_MEMORY / 65536
    });
  }

if (wasmMemory) {
  buffer = wasmMemory.buffer;
}

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['INITIAL_MEMORY'].
INITIAL_MEMORY = buffer.byteLength;
assert(INITIAL_MEMORY % 65536 === 0);
updateGlobalBufferAndViews(buffer);

// end include: runtime_init_memory.js

// include: runtime_init_table.js
// In regular non-RELOCATABLE mode the table is exported
// from the wasm module and this will be assigned once
// the exports are available.
var wasmTable;

// end include: runtime_init_table.js
// include: runtime_stack_check.js


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAP32[((max)>>2)] = 0x2135467;
  HEAP32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[0] = 0x63736d65; /* 'emsc' */
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x2135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten at 0x' + max.toString(16) + ', expected hex dwords 0x89BACDFE and 0x2135467, but received 0x' + cookie2.toString(16) + ' 0x' + cookie1.toString(16));
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[0] !== 0x63736d65 /* 'emsc' */) abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
}

// end include: runtime_stack_check.js
// include: runtime_assertions.js


// Endianness check
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function keepRuntimeAlive() {
  return noExitRuntime;
}

function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js


// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  {
    if (Module['onAbort']) {
      Module['onAbort'](what);
    }
  }

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // defintion for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// {{MEM_INITIALIZER}}

// include: memoryprofiler.js


// end include: memoryprofiler.js
// show errors on likely calls to FS when it was not included
var FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;

// include: URIUtils.js


// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  // Prefix of data URIs emitted by SINGLE_FILE and related options.
  return filename.startsWith(dataURIPrefix);
}

// Indicates whether filename is delivered via file protocol (as opposed to http/https)
function isFileURI(filename) {
  return filename.startsWith('file://');
}

// end include: URIUtils.js
/** @param {boolean=} fixedasm */
function createExportWrapper(name, fixedasm) {
  return function() {
    var displayName = name;
    var asm = fixedasm;
    if (!fixedasm) {
      asm = Module['asm'];
    }
    assert(runtimeInitialized, 'native function `' + displayName + '` called before runtime initialization');
    if (!asm[name]) {
      assert(asm[name], 'exported native function `' + displayName + '` not found');
    }
    return asm[name].apply(null, arguments);
  };
}

var wasmBinaryFile;
  wasmBinaryFile = '<<< WASM_BINARY_FILE >>>';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    var binary = tryParseAsDataURI(file);
    if (binary) {
      return binary;
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // If we don't have the binary yet, try to to load it asynchronously.
  // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
  // See https://github.com/github/fetch/pull/92#issuecomment-140665932
  // Cordova or Electron apps are typically loaded from a file:// url.
  // So use fetch if it is available and the url is not a file, otherwise fall back to XHR.
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch == 'function'
      && !isFileURI(wasmBinaryFile)
    ) {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      }).catch(function () {
          return getBinary(wasmBinaryFile);
      });
    }
    else {
      if (readAsync) {
        // fetch is not available or url is file => try XHR (readAsync uses XHR internally)
        return new Promise(function(resolve, reject) {
          readAsync(wasmBinaryFile, function(response) { resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))) }, reject)
        });
      }
    }
  }

  // Otherwise, getBinary should be able to get it synchronously
  return Promise.resolve().then(function() { return getBinary(wasmBinaryFile); });
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': asmLibraryArg,
    'wasi_snapshot_preview1': asmLibraryArg,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    var exports = instance.exports;

    Module['asm'] = exports;

    wasmTable = Module['asm']['__indirect_function_table'];
    assert(wasmTable, "table not found in wasm exports");

    addOnInit(Module['asm']['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');

  }
  // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(result['instance']);
  }

  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(function (instance) {
      return instance;
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);

      // Warn on some common problems.
      if (isFileURI(wasmBinaryFile)) {
        err('warning: Loading from a file URI (' + wasmBinaryFile + ') is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing');
      }
      abort(reason);
    });
  }

  function instantiateAsync() {
    if (!wasmBinary &&
        typeof WebAssembly.instantiateStreaming == 'function' &&
        !isDataURI(wasmBinaryFile) &&
        // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
        !isFileURI(wasmBinaryFile) &&
        // Avoid instantiateStreaming() on Node.js environment for now, as while
        // Node.js v18.1.0 implements it, it does not have a full fetch()
        // implementation yet.
        //
        // Reference:
        //   https://github.com/emscripten-core/emscripten/pull/16917
        !ENVIRONMENT_IS_NODE &&
        typeof fetch == 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        // Suppress closure warning here since the upstream definition for
        // instantiateStreaming only allows Promise<Repsponse> rather than
        // an actual Response.
        // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
        /** @suppress {checkTypes} */
        var result = WebAssembly.instantiateStreaming(response, info);

        return result.then(
          receiveInstantiationResult,
          function(reason) {
            // We expect the most common failure cause to be a bad MIME type for the binary,
            // in which case falling back to ArrayBuffer instantiation should work.
            err('wasm streaming compile failed: ' + reason);
            err('falling back to ArrayBuffer instantiation');
            return instantiateArrayBuffer(receiveInstantiationResult);
          });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult);
    }
  }

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  // Also pthreads and wasm workers initialize the wasm instance through this path.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateAsync();
  return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = {
  
};






  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = 'Program terminated with exit(' + status + ')';
      this.status = status;
    }

  function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    }

  function withStackSave(f) {
      var stack = stackSave();
      var ret = f();
      stackRestore(stack);
      return ret;
    }
  function demangle(func) {
      warnOnce('warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling');
      return func;
    }

  function demangleAll(text) {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1': return HEAP8[((ptr)>>0)];
        case 'i8': return HEAP8[((ptr)>>0)];
        case 'i16': return HEAP16[((ptr)>>1)];
        case 'i32': return HEAP32[((ptr)>>2)];
        case 'i64': return HEAP32[((ptr)>>2)];
        case 'float': return HEAPF32[((ptr)>>2)];
        case 'double': return HEAPF64[((ptr)>>3)];
        case '*': return HEAPU32[((ptr)>>2)];
        default: abort('invalid type for getValue: ' + type);
      }
      return null;
    }

  function handleException(e) {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      quit_(1, e);
    }

  function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      var chr = array[i];
      if (chr > 0xFF) {
        if (ASSERTIONS) {
          assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
        }
        chr &= 0xFF;
      }
      ret.push(String.fromCharCode(chr));
    }
    return ret.join('');
  }

  function jsStackTrace() {
      var error = new Error();
      if (!error.stack) {
        // IE10+ special cases: It does have callstack info, but it is only
        // populated if an Error object is thrown, so try that as a special-case.
        try {
          throw new Error();
        } catch(e) {
          error = e;
        }
        if (!error.stack) {
          return '(no stack trace available)';
        }
      }
      return error.stack.toString();
    }

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1': HEAP8[((ptr)>>0)] = value; break;
        case 'i8': HEAP8[((ptr)>>0)] = value; break;
        case 'i16': HEAP16[((ptr)>>1)] = value; break;
        case 'i32': HEAP32[((ptr)>>2)] = value; break;
        case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math.min((+(Math.floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)] = tempI64[0],HEAP32[(((ptr)+(4))>>2)] = tempI64[1]); break;
        case 'float': HEAPF32[((ptr)>>2)] = value; break;
        case 'double': HEAPF64[((ptr)>>3)] = value; break;
        case '*': HEAPU32[((ptr)>>2)] = value; break;
        default: abort('invalid type for setValue: ' + type);
      }
    }

  function stackTrace() {
      var js = jsStackTrace();
      if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
      return demangleAll(js);
    }

  function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    }

  function writeArrayToMemory(array, buffer) {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    }

  function getHeapMax() {
      return HEAPU8.length;
    }
  function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      return false; // malloc will report failure
    }

  function uleb128Encode(n, target) {
      assert(n < 16384);
      if (n < 128) {
        target.push(n);
      } else {
        target.push((n % 128) | 128, n >> 7);
      }
    }
  
  function sigToWasmTypes(sig) {
      var typeNames = {
        'i': 'i32',
        'j': 'i64',
        'f': 'f32',
        'd': 'f64',
        'p': 'i32',
      };
      var type = {
        parameters: [],
        results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
      };
      for (var i = 1; i < sig.length; ++i) {
        assert(sig[i] in typeNames, 'invalid signature char: ' + sig[i]);
        type.parameters.push(typeNames[sig[i]]);
      }
      return type;
    }
  function convertJsFunctionToWasm(func, sig) {
      return func;
    }
  
  var wasmTableMirror = [];
  function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
      return func;
    }
  function updateTableMap(offset, count) {
      if (functionsInTableMap) {
        for (var i = offset; i < offset + count; i++) {
          var item = getWasmTableEntry(i);
          // Ignore null values.
          if (item) {
            functionsInTableMap.set(item, i);
          }
        }
      }
    }
  
  var functionsInTableMap = undefined;
  
  var freeTableIndexes = [];
  function getEmptyTableSlot() {
      // Reuse a free index if there is one, otherwise grow.
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      // Grow the table
      try {
        wasmTable.grow(1);
      } catch (err) {
        if (!(err instanceof RangeError)) {
          throw err;
        }
        throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
      }
      return wasmTable.length - 1;
    }
  
  function setWasmTableEntry(idx, func) {
      wasmTable.set(idx, func);
      // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overriden to return wrapped
      // functions so we need to call it here to retrieve the potential wrapper correctly
      // instead of just storing 'func' directly into wasmTableMirror
      wasmTableMirror[idx] = wasmTable.get(idx);
    }
  /** @param {string=} sig */
  function addFunction(func, sig) {
      assert(typeof func != 'undefined');
  
      // Check if the function is already in the table, to ensure each function
      // gets a unique index. First, create the map if this is the first use.
      if (!functionsInTableMap) {
        functionsInTableMap = new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      if (functionsInTableMap.has(func)) {
        return functionsInTableMap.get(func);
      }
  
      // It's not in the table, add it now.
  
      var ret = getEmptyTableSlot();
  
      // Set the new value.
      try {
        // Attempting to call this with JS function will cause of table.set() to fail
        setWasmTableEntry(ret, func);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err;
        }
        assert(typeof sig != 'undefined', 'Missing signature argument to addFunction: ' + func);
        var wrapped = convertJsFunctionToWasm(func, sig);
        setWasmTableEntry(ret, wrapped);
      }
  
      functionsInTableMap.set(func, ret);
  
      return ret;
    }

  function removeFunction(index) {
      functionsInTableMap.delete(getWasmTableEntry(index));
      freeTableIndexes.push(index);
    }

  var ALLOC_NORMAL = 0;
  
  var ALLOC_STACK = 1;
  function allocate(slab, allocator) {
      var ret;
      assert(typeof allocator == 'number', 'allocate no longer takes a type argument')
      assert(typeof slab != 'number', 'allocate no longer takes a number as arg0')
  
      if (allocator == ALLOC_STACK) {
        ret = stackAlloc(slab.length);
      } else {
        ret = _malloc(slab.length);
      }
  
      if (!slab.subarray && !slab.slice) {
        slab = new Uint8Array(slab);
      }
      HEAPU8.set(slab, ret);
      return ret;
    }



  function AsciiToString(ptr) {
      var str = '';
      while (1) {
        var ch = HEAPU8[((ptr++)>>0)];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    }

  /** @param {boolean=} dontAddNull */
  function writeAsciiToMemory(str, buffer, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        assert(str.charCodeAt(i) === (str.charCodeAt(i) & 0xff));
        HEAP8[((buffer++)>>0)] = str.charCodeAt(i);
      }
      // Null-terminate the pointer to the HEAP.
      if (!dontAddNull) HEAP8[((buffer)>>0)] = 0;
    }
  function stringToAscii(str, outPtr) {
      return writeAsciiToMemory(str, outPtr, false);
    }

  var UTF16Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf-16le') : undefined;;
  function UTF16ToString(ptr, maxBytesToRead) {
      assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
      var endPtr = ptr;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
      // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
  
      if (endPtr - ptr > 32 && UTF16Decoder) {
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
      } else {
        var str = '';
  
        // If maxBytesToRead is not passed explicitly, it will be undefined, and the for-loop's condition
        // will always evaluate to true. The loop is then terminated on the first null char.
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
          var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
          if (codeUnit == 0) break;
          // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
          str += String.fromCharCode(codeUnit);
        }
  
        return str;
      }
    }

  function stringToUTF16(str, outPtr, maxBytesToWrite) {
      assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7FFFFFFF;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2; // Null terminator.
      var startPtr = outPtr;
      var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        HEAP16[((outPtr)>>1)] = codeUnit;
        outPtr += 2;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP16[((outPtr)>>1)] = 0;
      return outPtr - startPtr;
    }

  function lengthBytesUTF16(str) {
      return str.length*2;
    }

  function UTF32ToString(ptr, maxBytesToRead) {
      assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
      var i = 0;
  
      var str = '';
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
        if (utf32 == 0) break;
        ++i;
        // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        if (utf32 >= 0x10000) {
          var ch = utf32 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }

  function stringToUTF32(str, outPtr, maxBytesToWrite) {
      assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7FFFFFFF;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
        }
        HEAP32[((outPtr)>>2)] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP32[((outPtr)>>2)] = 0;
      return outPtr - startPtr;
    }

  function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
        len += 4;
      }
  
      return len;
    }

  function allocateUTF8(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }

  function allocateUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }

  /** @deprecated @param {boolean=} dontAddNull */
  function writeStringToMemory(string, buffer, dontAddNull) {
      warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');
  
      var /** @type {number} */ lastChar, /** @type {number} */ end;
      if (dontAddNull) {
        // stringToUTF8Array always appends null. If we don't want to do that, remember the
        // character that existed at the location where the null will be placed, and restore
        // that after the write (below).
        end = buffer + lengthBytesUTF8(string);
        lastChar = HEAP8[end];
      }
      stringToUTF8(string, buffer, Infinity);
      if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
    }



  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }



  function getCFunc(ident) {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    }
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  function ccall(ident, returnType, argTypes, args, opts) {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            var len = (str.length << 2) + 1;
            ret = stackAlloc(len);
            stringToUTF8(str, ret, len);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    }

  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  function cwrap(ident, returnType, argTypes, opts) {
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      }
    }

var ASSERTIONS = true;

// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {string} input The string to decode.
 */
var decodeBase64 = typeof atob == 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE == 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf = Buffer.from(s, 'base64');
    return new Uint8Array(buf['buffer'], buf['byteOffset'], buf['byteLength']);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var asmLibraryArg = {
  "emscripten_resize_heap": _emscripten_resize_heap,
  "getTempRet0": getTempRet0,
  "memory": wasmMemory,
  "setTempRet0": setTempRet0
};
var asm = createWasm();
/** @type {function(...*):?} */
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");

/** @type {function(...*):?} */
var ___errno_location = Module["___errno_location"] = createExportWrapper("__errno_location");

/** @type {function(...*):?} */
var _malloc = Module["_malloc"] = createExportWrapper("malloc");

/** @type {function(...*):?} */
var _free = Module["_free"] = createExportWrapper("free");

/** @type {function(...*):?} */
var _fflush = Module["_fflush"] = createExportWrapper("fflush");

/** @type {function(...*):?} */
var _htonl = Module["_htonl"] = createExportWrapper("htonl");

/** @type {function(...*):?} */
var _htons = Module["_htons"] = createExportWrapper("htons");

/** @type {function(...*):?} */
var _ntohs = Module["_ntohs"] = createExportWrapper("ntohs");

/** @type {function(...*):?} */
var _setThrew = Module["_setThrew"] = createExportWrapper("setThrew");

/** @type {function(...*):?} */
var _emscripten_stack_init = Module["_emscripten_stack_init"] = function() {
  return (_emscripten_stack_init = Module["_emscripten_stack_init"] = Module["asm"]["emscripten_stack_init"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = function() {
  return (_emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = function() {
  return (_emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = Module["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var _emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = function() {
  return (_emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
};

/** @type {function(...*):?} */
var stackSave = Module["stackSave"] = createExportWrapper("stackSave");

/** @type {function(...*):?} */
var stackRestore = Module["stackRestore"] = createExportWrapper("stackRestore");

/** @type {function(...*):?} */
var stackAlloc = Module["stackAlloc"] = createExportWrapper("stackAlloc");

/** @type {function(...*):?} */
var ___cxa_can_catch = Module["___cxa_can_catch"] = createExportWrapper("__cxa_can_catch");

/** @type {function(...*):?} */
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = createExportWrapper("__cxa_is_pointer_type");





// === Auto-generated postamble setup entry stuff ===


var unexportedRuntimeSymbols = [
  'run',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'FS_createFolder',
  'FS_createPath',
  'FS_createDataFile',
  'FS_createPreloadedFile',
  'FS_createLazyFile',
  'FS_createLink',
  'FS_createDevice',
  'FS_unlink',
  'getLEB',
  'getFunctionTables',
  'alignFunctionTables',
  'registerFunctions',
  'prettyPrint',
  'getCompilerSetting',
  'print',
  'printErr',
  'getTempRet0',
  'setTempRet0',
  'callMain',
  'abort',
  'keepRuntimeAlive',
  'wasmMemory',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'writeStackCookie',
  'checkStackCookie',
  'intArrayFromBase64',
  'tryParseAsDataURI',
  'ptrToString',
  'zeroMemory',
  'stringToNewUTF8',
  'exitJS',
  'getHeapMax',
  'emscripten_realloc_buffer',
  'ENV',
  'ERRNO_CODES',
  'ERRNO_MESSAGES',
  'setErrNo',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'DNS',
  'getHostByName',
  'Protocols',
  'Sockets',
  'getRandomDevice',
  'warnOnce',
  'traverseStack',
  'UNWIND_CACHE',
  'convertPCtoSourceLocation',
  'readAsmConstArgsArray',
  'readAsmConstArgs',
  'mainThreadEM_ASM',
  'jstoi_q',
  'jstoi_s',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'handleException',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'safeSetTimeout',
  'asmjsMangle',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getCFunc',
  'ccall',
  'cwrap',
  'uleb128Encode',
  'sigToWasmTypes',
  'convertJsFunctionToWasm',
  'freeTableIndexes',
  'functionsInTableMap',
  'getEmptyTableSlot',
  'updateTableMap',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'intArrayFromString',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16Decoder',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'writeStringToMemory',
  'writeArrayToMemory',
  'writeAsciiToMemory',
  'SYSCALLS',
  'getSocketFromFD',
  'getSocketAddress',
  'JSEvents',
  'registerKeyEventCallback',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'demangle',
  'demangleAll',
  'jsStackTrace',
  'stackTrace',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'flush_NO_FILESYSTEM',
  'dlopenMissingError',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'ExceptionInfo',
  'exception_addRef',
  'exception_decRef',
  'getExceptionMessageCommon',
  'incrementExceptionRefcount',
  'decrementExceptionRefcount',
  'getExceptionMessage',
  'Browser',
  'setMainLoop',
  'wget',
  'FS',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  '_setNetworkCallback',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'GL',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  'writeGLArray',
  'AL',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'SDL',
  'SDL_gfx',
  'GLUT',
  'EGL',
  'GLFW_Window',
  'GLFW',
  'GLEW',
  'IDBStore',
  'runAndAbortIfError',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
];
unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
var missingLibrarySymbols = [
  'ptrToString',
  'zeroMemory',
  'stringToNewUTF8',
  'exitJS',
  'emscripten_realloc_buffer',
  'setErrNo',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'getHostByName',
  'getRandomDevice',
  'traverseStack',
  'convertPCtoSourceLocation',
  'readAsmConstArgs',
  'mainThreadEM_ASM',
  'jstoi_q',
  'jstoi_s',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'safeSetTimeout',
  'asmjsMangle',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'getSocketFromFD',
  'getSocketAddress',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'getEnvStrings',
  'checkWasiClock',
  'flush_NO_FILESYSTEM',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'ExceptionInfo',
  'exception_addRef',
  'exception_decRef',
  'getExceptionMessageCommon',
  'incrementExceptionRefcount',
  'decrementExceptionRefcount',
  'getExceptionMessage',
  'setMainLoop',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  'writeGLArray',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'GLFW_Window',
  'runAndAbortIfError',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)


var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }

    stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
    warnOnce('(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();





