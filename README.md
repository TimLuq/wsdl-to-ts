# wsdl-to-ts
A CLI tool and library for nodejs to generate TypeScript typings from a WSDL service.

## Installation
Installation is done through [npm](https://npmjs.com).

### Installation for Command Line usage

To install CLI tool globally run the following command as root or sudo:
```sh
$ npm install -g wsdl-to-ts
```

To install CLI tool for the current user this command may be used (which places working directory at users `$HOME`):
```sh
$ cd && npm install wsdl-to-ts
```

### Installation for Library usage

To install a library as a dependency to your current npm project you enter your project directory as the current directory and run the following commands:
```sh
$ npm install --save wsdl-to-ts
```

## Usage

If any more documentation is needed for library usage, other than the IDE completions; feel free to open an [issue](https://github.com/TimLuq/wsdl-to-ts/issues).

### Usage for Command Line

Check version:
```sh
$ wsdl-to-ts --version
```

Generate typings for a WSDL located on an URI at the default output directory (multiple may be done at the same time by listing more on the command line):
```sh
$ cd /tmp
$ wsdl-to-ts "https://www.w3schools.com/xml/tempconvert.asmx?WSDL"
$ ls wsdl/**/*
wsdl/TempConvert/TempConvertSoap12.ts  wsdl/TempConvert/TempConvertSoap.ts
```

The output directory may be changed to any directory using the `--outdir` flag.
```sh
$ wsdl-to-ts --outdir="./some/other/dir" "https://www.w3schools.com/xml/tempconvert.asmx?WSDL"
```

#### CLI flags
* `--version` - Display which version you are currently executing.
* `--outdir=SOME/DIR/PATH` - Sets the path which will contain the type definitions.
* `--tslint=RULE0,RULE1,RULE2` - Enable specified rules in all generated files.
* `--tslint=false` - Disables tslint in all generated files.
* `--tslint-disable=RULE0,RULE1,RULE2` - Disable specified rules in all generated files.
