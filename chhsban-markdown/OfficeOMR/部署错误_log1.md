starting build "b3a84d95-699f-441b-b14a-8469fcbc2880" using release legacy
FETCHSOURCE
BUILD
Starting Step #0 - "fetch"
Step #0 - "fetch": Pulling image: us-central1-docker.pkg.dev/serverless-runtimes/utilities/gcs-fetcher:base_20260522_18_04_RC00
Step #0 - "fetch": base_20260522_18_04_RC00: Pulling from serverless-runtimes/utilities/gcs-fetcher
Step #0 - "fetch": 19bda58a5976: Pulling fs layer
Step #0 - "fetch": 19bda58a5976: Verifying Checksum
Step #0 - "fetch": 19bda58a5976: Download complete
Step #0 - "fetch": 19bda58a5976: Pull complete
Step #0 - "fetch": Digest: sha256:2a0b875d5b008f08d91f746137f35e7ce187be1ffc34730f61146364b5814a77
Step #0 - "fetch": Status: Downloaded newer image for us-central1-docker.pkg.dev/serverless-runtimes/utilities/gcs-fetcher:base_20260522_18_04_RC00
Step #0 - "fetch": us-central1-docker.pkg.dev/serverless-runtimes/utilities/gcs-fetcher:base_20260522_18_04_RC00
Step #0 - "fetch": Fetching archive gs://gcf-v2-sources-601814582794-us-central1/recognize_sheet/function-source.zip.
Step #0 - "fetch": ******************************************************
Step #0 - "fetch": Status:                      SUCCESS
Step #0 - "fetch": Started:                     2026-11-05T02:50:29Z
Step #0 - "fetch": Completed:                   2026-11-05T02:50:35Z
Step #0 - "fetch": Total files:         8713
Step #0 - "fetch": MiB downloaded:       110.40 MiB
Step #0 - "fetch": MiB/s throughput:     106.91 MiB/s
Step #0 - "fetch": Time for zipfile:       1.03 s
Step #0 - "fetch": Time to unzip:          4.30 s
Step #0 - "fetch": Total time:             5.36 s
Step #0 - "fetch": ******************************************************
Finished Step #0 - "fetch"
Starting Step #1 - "pre-buildpack"
Step #1 - "pre-buildpack": Pulling image: us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00
Step #1 - "pre-buildpack": python_20261022_RC00: Pulling from serverless-runtimes/google-22-full/builder/python
Step #1 - "pre-buildpack": dc541b8d0272: Already exists
Step #1 - "pre-buildpack": 5df553e46127: Already exists
Step #1 - "pre-buildpack": b8313332dfda: Already exists
Step #1 - "pre-buildpack": ab9f990f6df2: Pulling fs layer
Step #1 - "pre-buildpack": 2028c6bcd4ee: Pulling fs layer
Step #1 - "pre-buildpack": 7f3627fda513: Pulling fs layer
Step #1 - "pre-buildpack": b94500347992: Pulling fs layer
Step #1 - "pre-buildpack": b02cf8b7db6f: Pulling fs layer
Step #1 - "pre-buildpack": b2992a52fc0f: Pulling fs layer
Step #1 - "pre-buildpack": fe0a88c014e5: Pulling fs layer
Step #1 - "pre-buildpack": 264f4b87a469: Pulling fs layer
Step #1 - "pre-buildpack": ef3a7a6aa3c5: Pulling fs layer
Step #1 - "pre-buildpack": 34517035d7eb: Pulling fs layer
Step #1 - "pre-buildpack": 34ce8ba30961: Pulling fs layer
Step #1 - "pre-buildpack": e6178d2c0976: Pulling fs layer
Step #1 - "pre-buildpack": 4f4fb700ef54: Pulling fs layer
Step #1 - "pre-buildpack": fe0a88c014e5: Waiting
Step #1 - "pre-buildpack": 264f4b87a469: Waiting
Step #1 - "pre-buildpack": ef3a7a6aa3c5: Waiting
Step #1 - "pre-buildpack": 34517035d7eb: Waiting
Step #1 - "pre-buildpack": 34ce8ba30961: Waiting
Step #1 - "pre-buildpack": e6178d2c0976: Waiting
Step #1 - "pre-buildpack": 4f4fb700ef54: Waiting
Step #1 - "pre-buildpack": 2028c6bcd4ee: Verifying Checksum
Step #1 - "pre-buildpack": 2028c6bcd4ee: Download complete
Step #1 - "pre-buildpack": ab9f990f6df2: Download complete
Step #1 - "pre-buildpack": 7f3627fda513: Verifying Checksum
Step #1 - "pre-buildpack": 7f3627fda513: Download complete
Step #1 - "pre-buildpack": b94500347992: Verifying Checksum
Step #1 - "pre-buildpack": b94500347992: Download complete
Step #1 - "pre-buildpack": fe0a88c014e5: Verifying Checksum
Step #1 - "pre-buildpack": fe0a88c014e5: Download complete
Step #1 - "pre-buildpack": b2992a52fc0f: Verifying Checksum
Step #1 - "pre-buildpack": b2992a52fc0f: Download complete
Step #1 - "pre-buildpack": ef3a7a6aa3c5: Verifying Checksum
Step #1 - "pre-buildpack": ef3a7a6aa3c5: Download complete
Step #1 - "pre-buildpack": 34517035d7eb: Verifying Checksum
Step #1 - "pre-buildpack": 34517035d7eb: Download complete
Step #1 - "pre-buildpack": 34ce8ba30961: Verifying Checksum
Step #1 - "pre-buildpack": 34ce8ba30961: Download complete
Step #1 - "pre-buildpack": ab9f990f6df2: Pull complete
Step #1 - "pre-buildpack": 4f4fb700ef54: Verifying Checksum
Step #1 - "pre-buildpack": 4f4fb700ef54: Download complete
Step #1 - "pre-buildpack": e6178d2c0976: Verifying Checksum
Step #1 - "pre-buildpack": e6178d2c0976: Download complete
Step #1 - "pre-buildpack": b02cf8b7db6f: Verifying Checksum
Step #1 - "pre-buildpack": b02cf8b7db6f: Download complete
Step #1 - "pre-buildpack": 264f4b87a469: Verifying Checksum
Step #1 - "pre-buildpack": 264f4b87a469: Download complete
Step #1 - "pre-buildpack": 2028c6bcd4ee: Pull complete
Step #1 - "pre-buildpack": 7f3627fda513: Pull complete
Step #1 - "pre-buildpack": b94500347992: Pull complete
Step #1 - "pre-buildpack": b02cf8b7db6f: Pull complete
Step #1 - "pre-buildpack": b2992a52fc0f: Pull complete
Step #1 - "pre-buildpack": fe0a88c014e5: Pull complete
Step #1 - "pre-buildpack": 264f4b87a469: Pull complete
Step #1 - "pre-buildpack": ef3a7a6aa3c5: Pull complete
Step #1 - "pre-buildpack": 34517035d7eb: Pull complete
Step #1 - "pre-buildpack": 34ce8ba30961: Pull complete
Step #1 - "pre-buildpack": e6178d2c0976: Pull complete
Step #1 - "pre-buildpack": 4f4fb700ef54: Pull complete
Step #1 - "pre-buildpack": Digest: sha256:0c5041cd00642985c746abead1cceee1af310a891ffb803481030df981062ad3
Step #1 - "pre-buildpack": Status: Downloaded newer image for us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00
Step #1 - "pre-buildpack": us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00
Step #1 - "pre-buildpack": Preparing directory /layers
Step #1 - "pre-buildpack": Preparing directory /workspace
Step #1 - "pre-buildpack": Preparing directory /builder/home
Step #1 - "pre-buildpack": Preparing directory /builder/outputs
Step #1 - "pre-buildpack": Preparing directory /platform/env
Step #1 - "pre-buildpack": Passing build environment variable BUILDER_OUTPUT to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_RUNTIME to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_BUILDER_VERSION to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_BUILDER_IMAGE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_RUN_IMAGE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_SOURCE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_USE_SERVERLESS_RUNTIMES_TARBALLS to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_RUNTIME_IMAGE_REGION to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_RUNTIME_VERSION to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable X_GOOGLE_SKIP_RUNTIME_LAUNCH to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_BUILD_ENV to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_BUILD_UNIVERSE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_TPC_TARBALL_PROJECT to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_TPC_HOSTNAME to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_FUNCTION_TARGET to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_FUNCTION_SIGNATURE_TYPE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable X_GOOGLE_TARGET_PLATFORM to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_BUILD_ID to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_BASE_IMAGE to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable GOOGLE_LABEL_FUNCTION_TARGET to buildpacks
Step #1 - "pre-buildpack": Passing build environment variable X_GOOGLE_SET_NODE_HEAP_SIZE to buildpacks
Step #1 - "pre-buildpack": Checking if image us-central1-docker.pkg.dev/officeomr-fe542/gcf-artifacts/officeomr--fe542__us--central1__recognize__sheet/cache:latest exists
Step #1 - "pre-buildpack": Image us-central1-docker.pkg.dev/officeomr-fe542/gcf-artifacts/officeomr--fe542__us--central1__recognize__sheet/cache:latest does not exist
Step #1 - "pre-buildpack": WARNING: Failed to reuse previous cache image; will not affect current build: image us-central1-docker.pkg.dev/officeomr-fe542/gcf-artifacts/officeomr--fe542__us--central1__recognize__sheet/cache:latest does not exist
Finished Step #1 - "pre-buildpack"
Starting Step #2 - "build"
Step #2 - "build": Already have image (with digest): us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00
Step #2 - "build": ===> ANALYZING
Step #2 - "build": Image with name "us-central1-docker.pkg.dev/officeomr-fe542/gcf-artifacts/officeomr--fe542__us--central1__recognize__sheet:latest" not found
Step #2 - "build": ===> DETECTING
Step #2 - "build": target distro name/version labels not found, reading /etc/os-release file
Step #2 - "build": 6 of 7 buildpacks participating
Step #2 - "build": google.utils.archive-source       0.0.1
Step #2 - "build": google.python.runtime             0.9.1
Step #2 - "build": google.python.functions-framework 0.9.6
Step #2 - "build": google.python.pip                 0.9.2
Step #2 - "build": google.utils.label-image          0.0.2
Step #2 - "build": google.python.link-runtime        0.0.1
Step #2 - "build": ===> RESTORING
Step #2 - "build": Layer cache not found
Step #2 - "build": ===> BUILDING
Step #2 - "build": target distro name/version labels not found, reading /etc/os-release file
Step #2 - "build": === Utils - Archive Source Using Runner (google.utils.archive-source@0.0.1) ===
Step #2 - "build": Adding image label google.source-archive: /workspace/.googlebuild/source-code.tar.gz
Step #2 - "build": === Python - Runtime Using Runner (google.python.runtime@0.9.1) ===
Step #2 - "build": layers path: /layers/google.python.runtime/python
Step #2 - "build": Using Python version from GOOGLE_RUNTIME_VERSION: 3.11.17
Step #2 - "build": Using exact version 3.11.17 for Python
Step #2 - "build": Installing Python v3.11.17.
Step #2 - "build": Runtime successfully downloaded from us-central1-docker.pkg.dev/serverless-runtimes/runtimes-ubuntu2204/python:3.11.17
Step #2 - "build": === Python - Functions Framework Using Runner (google.python.functions-framework@0.9.6) ===
Step #2 - "build": --------------------------------------------------------------------------------
Step #2 - "build": Running "python3 -m compileall -f -q ."
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_array_like.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_array_like.py", line 15
Step #2 - "build":     type NDArray[ScalarT: np.generic] = np.ndarray[_AnyShape, np.dtype[ScalarT]]
Step #2 - "build":          ^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_char_codes.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_char_codes.py", line 3
Step #2 - "build":     type _BoolCodes = Literal["bool", "bool_", "?", "b1", "|b1", "=b1", "<b1", ">b1"]
Step #2 - "build":          ^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_dtype_like.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_dtype_like.py", line 21
Step #2 - "build":     type _DTypeLikeNested = Any  # TODO: wait for support for recursive types
Step #2 - "build":          ^^^^^^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_nbit.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_nbit.py", line 6
Step #2 - "build":     type _NBitByte = _8Bit
Step #2 - "build":          ^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_scalars.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_scalars.py", line 7
Step #2 - "build":     type _CharLike_co = str | bytes
Step #2 - "build":          ^^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_shape.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_shape.py", line 4
Step #2 - "build":     type _Shape = tuple[int, ...]
Step #2 - "build":          ^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/typing/mypy_plugin.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/typing/mypy_plugin.py", line 118
Step #2 - "build":     type _HookFunc = Callable[[AnalyzeTypeContext], mypy.types.Type]
Step #2 - "build":          ^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py", line 8
Step #2 - "build":     type MaskedArray[ScalarT: np.generic] = np.ma.MaskedArray[_Shape, np.dtype[ScalarT]]
Step #2 - "build":          ^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": Done "python3 -m compileall -f -q ." (9.860856416s)
Step #2 - "build": --------------------------------------------------------------------------------
Step #2 - "build": failed to build: (error ID: 49c34848):
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_array_like.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_array_like.py", line 15
Step #2 - "build":     type NDArray[ScalarT: np.generic] = np.ndarray[_AnyShape, np.dtype[ScalarT]]
Step #2 - "build":          ^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_char_codes.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_char_codes.py", line 3
Step #2 - "build":     type _BoolCodes = Literal["bool", "bool_", "?", "b1", "|b1", "=b1", "<b1", ">b1"]
Step #2 - "build":          ^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_dtype_like.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_dtype_like.py", line 21
Step #2 - "build":     type _DTypeLikeNested = Any  # TODO: wait for support for recursive types
Step #2 - "build":          ^^^^^^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_nbit.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_nbit.py", line 6
Step #2 - "build":     type _NBitByte = _8Bit
Step #2 - "build":          ^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_scalars.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_scalars.py", line 7
Step #2 - "build":     type _CharLike_co = str | bytes
Step #2 - "build":          ^^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/_typing/_shape.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/_typing/_shape.py", line 4
Step #2 - "build":     type _Shape = tuple[int, ...]
Step #2 - "build":          ^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/typing/mypy_plugin.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/typing/mypy_plugin.py", line 118
Step #2 - "build":     type _HookFunc = Callable[[AnalyzeTypeContext], mypy.types.Type]
Step #2 - "build":          ^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": 
Step #2 - "build": *** Error compiling './venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py'...
Step #2 - "build":   File "./venv/Lib/site-packages/numpy/typing/tests/data/pass/ma.py", line 8
Step #2 - "build":     type MaskedArray[ScalarT: np.generic] = np.ma.MaskedArray[_Shape, np.dtype[ScalarT]]
Step #2 - "build":          ^^^^^^^^^^^
Step #2 - "build": SyntaxError: invalid syntax
Step #2 - "build": ERROR: failed to build: exit status 1
Finished Step #2 - "build"
ERROR
ERROR: build step 2 "us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/builder/python:python_20261022_RC00" failed: step exited with non-zero status: 51

