VccWallet Fullnode is a z-Addr first, Sprout compatible wallet and full node for vcoind that runs on Linux, Windows.


# Installation

Head over to the releases page and grab the latest installers or binary. https://github.com/VCOINCURRENCY/vccwallet/releases

### Linux

If you are on Debian/Ubuntu, please download the '.AppImage' package and just run it.

```
./Vccwallet.Fullnode-0.0.1.AppImage
```

If you prefer to install a `.deb` package, that is also available.

```
sudo dpkg -i vccwallet_0.0.1_amd64.deb
sudo apt install -f
```

### Windows

Download the release binary, unzip it and double click on `Vccwallet Fullnode.exe` to start.


## vcoind

VccWallet needs a Vcoin node running vcoind. If you already have a vcoind node running, VccWallet will connect to it.

If you don't have one, VccWallet will start its embedded vcoind node.

Additionally, if this is the first time you're running VccWallet or a vcoind daemon, VccWallet will download the Vcoin params (~1877 MB) and configure `vcoin.conf` for you.

## Compiling from source

VccWallet is written in Electron/Javascript and can be build from source. Note that if you are compiling from source, you won't get the embedded vcoind by default. You can either run an external vcoind, or compile vcoind as well.

#### Pre-Requisits

You need to have the following software installed before you can build Vccwallet Fullnode

- Nodejs v12.16.1 or higher - https://nodejs.org
- Yarn - https://yarnpkg.com

```
git clone https://github.com/VCOINCURRENCY/vccwallet.git
cd vccwallet

yarn install
yarn build
```

To start in development mode, run

```
yarn dev
```

To start in production mode, run

```
yarn start
```

