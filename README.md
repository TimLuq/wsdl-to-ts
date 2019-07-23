# wsdl-to-ts

<a href="https://travis-ci.org/TimLuq/wsdl-to-ts">
    <img src="https://travis-ci.org/TimLuq/wsdl-to-ts.svg?branch=master"
         alt="build status" />
</a>
<a href="https://www.npmjs.com/package/wsdl-to-ts">
    <img src="https://img.shields.io/npm/v/wsdl-to-ts.svg"
         alt="npm version" />
</a>
<a href="https://github.com/TimLuq/wsdl-to-ts/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/wsdl-to-ts.svg"
         alt="license" />
</a>
<a href="https://david-dm.org/TimLuq/wsdl-to-ts">
    <img src="https://david-dm.org/TimLuq/wsdl-to-ts/status.svg"
         alt="dependency status" />
</a>

A CLI tool and library for nodejs to generate TypeScript typings from a WSDL service.

## Installation
Installation is done either through [npm](https://npmjs.com) or [yarn](https://yarnpkg.com).

### Installation for Command Line usage

To install CLI tool globally run one of the following command as root or sudo:
```sh
$ npm install -g wsdl-to-ts
$ yarn global add wsdl-to-ts
```

To install CLI tool for the current user one of these commands may be used (which places working directory at users `$HOME`):
```sh
$ cd && npm install wsdl-to-ts
$ cd && yarn add wsdl-to-ts
```

### Installation for Library usage

To install a library as a dependency to your current npm project you enter your project directory as the current directory and run one of the following commands:
```sh
$ npm install --save wsdl-to-ts
$ yarn add wsdl-to-ts
```

## Usage

If any more documentation is needed for library usage, other than the IDE completions; feel free to open an [issue](https://github.com/TimLuq/wsdl-to-ts/issues). Also take a look at the [type definitions](https://github.com/TimLuq/wsdl-to-ts/blob/master/esm/wsdl-to-ts.d.ts)

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

Optionally to disable ssl or add basic auth to the soap service pass in:

* `--url` - pass in the wsdl url 
* `--user` - pass in the user name for basic authentication
* `--password` - pass in the password for basic authentication

#### Example VSCode setup

tasks.json
```json
{
    // See https://go.microsoft.com/fwlink/?LinkId=733558 
    // for the documentation about the tasks.json format
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "build",
            "problemMatcher": []
        },
        {
            "type": "npm",
            "script": "debug",
            "problemMatcher": []
        }
    ]
}
```
launch.json
```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch via NPM",
            "preLaunchTask": "npm: build",
            "runtimeExecutable": "npm",
            "runtimeArgs": [
                "run-script",
                "debug",
                "--",
                "--url",
                "<https://wsdl.com/blah?wsdl>",
                "--user",
                "<username>",
                "--password" ,
                "<password>"
                "--verifySSL",
                "<true/false>"
            ],
            "port": 9229
        }
    ]
}
```