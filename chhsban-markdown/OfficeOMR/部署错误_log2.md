Already have image (with digest): us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00
===> ANALYZING
Image with name "us-central1-docker.pkg.dev/officeomr-fe542/gcf-artifacts/officeomr--fe542__us--central1__recognize__sheet:latest" not found
===> DETECTING
target distro name/version labels not found, reading /etc/os-release file
6 of 7 buildpacks participating
google.utils.archive-source       0.0.1
google.python.runtime             0.9.1
google.python.functions-framework 0.9.6
google.python.pip                 0.9.2
google.utils.label-image          0.0.2
google.python.link-runtime        0.0.1
===> RESTORING
Layer cache not found
===> BUILDING
target distro name/version labels not found, reading /etc/os-release file
=== Utils - Archive Source Using Runner (google.utils.archive-source@0.0.1) ===
Adding image label google.source-archive: /workspace/.googlebuild/source-code.tar.gz
=== Python - Runtime Using Runner (google.python.runtime@0.9.1) ===
layers path: /layers/google.python.runtime/python
Using Python version from GOOGLE_RUNTIME_VERSION: 3.11.17
Using exact version 3.11.17 for Python
Installing Python v3.11.17.
Runtime successfully downloaded from us-central1-docker.pkg.dev/serverless-runtimes/runtimes-ubuntu2204/python:3.11.17
=== Python - Functions Framework Using Runner (google.python.functions-framework@0.9.6) ===
--------------------------------------------------------------------------------
Running "python3 -m compileall -f -q ."
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_array_like.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_array_like.py", line 15
    type NDArray[ScalarT: np.generic] = np.ndarray[_AnyShape, np.dtype[ScalarT]]
         ^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_char_codes.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_char_codes.py", line 3
    type _BoolCodes = Literal["bool", "bool_", "?", "b1", "|b1", "=b1", "<b1", ">b1"]
         ^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_dtype_like.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_dtype_like.py", line 21
    type _DTypeLikeNested = Any  # TODO: wait for support for recursive types
         ^^^^^^^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_nbit.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_nbit.py", line 6
    type _NBitByte = _8Bit
         ^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_scalars.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_scalars.py", line 7
    type _CharLike_co = str | bytes
         ^^^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_shape.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_shape.py", line 4
    type _Shape = tuple[int, ...]
         ^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/typing/mypy_plugin.py'...
  File "./venv/Lib/site-packages/numpy/typing/mypy_plugin.py", line 118
    type _HookFunc = Callable[[AnalyzeTypeContext], mypy.types.Type]
         ^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py'...
  File "./venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py", line 8
    type MaskedArray[ScalarT: np.generic] = np.ma.MaskedArray[_Shape, np.dtype[ScalarT]]
         ^^^^^^^^^^^
SyntaxError: invalid syntax
Done "python3 -m compileall -f -q ." (9.860856416s)
--------------------------------------------------------------------------------
failed to build: (error ID: 49c34848):
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_array_like.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_array_like.py", line 15
    type NDArray[ScalarT: np.generic] = np.ndarray[_AnyShape, np.dtype[ScalarT]]
         ^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_char_codes.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_char_codes.py", line 3
    type _BoolCodes = Literal["bool", "bool_", "?", "b1", "|b1", "=b1", "<b1", ">b1"]
         ^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_dtype_like.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_dtype_like.py", line 21
    type _DTypeLikeNested = Any  # TODO: wait for support for recursive types
         ^^^^^^^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_nbit.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_nbit.py", line 6
    type _NBitByte = _8Bit
         ^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_scalars.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_scalars.py", line 7
    type _CharLike_co = str | bytes
         ^^^^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/_typing/_shape.py'...
  File "./venv/Lib/site-packages/numpy/_typing/_shape.py", line 4
    type _Shape = tuple[int, ...]
         ^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/typing/mypy_plugin.py'...
  File "./venv/Lib/site-packages/numpy/typing/mypy_plugin.py", line 118
    type _HookFunc = Callable[[AnalyzeTypeContext], mypy.types.Type]
         ^^^^^^^^^
SyntaxError: invalid syntax
*** Error compiling './venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py'...
  File "./venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py", line 8
    type MaskedArray[ScalarT: np.generic] = np.ma.MaskedArray[_Shape, np.dtype[ScalarT]]
         ^^^^^^^^^^^
SyntaxError: invalid syntax
ERROR: failed to build: exit status 1