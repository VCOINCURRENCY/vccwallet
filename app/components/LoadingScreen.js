/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import { Redirect, withRouter } from 'react-router';
import ini from 'ini';
import fs from 'fs';
import request from 'request';
import progress from 'progress-stream';
import os from 'os';
import path from 'path';
import { remote, ipcRenderer, shell } from 'electron';
import { spawn } from 'child_process';
import { promisify } from 'util';
import routes from '../constants/routes.json';
import { RPCConfig, Info } from './AppState';
import RPC from '../rpc';
import cstyles from './Common.module.css';
import styles from './LoadingScreen.module.css';
import { NO_CONNECTION } from '../utils/utils';
import Logo from '../assets/img/walleticon.png';
import vcoindlogo from '../assets/img/vcoindlogo.gif';

const locateVcoinConfDir = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'Vcoin');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.vcoin');
  }

  return path.join(remote.app.getPath('appData'), 'Vcoin');
};

const locateVcoinConf = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'Vcoin', 'vcoin.conf');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.vcoin', 'vcoin.conf');
  }

  return path.join(remote.app.getPath('appData'), 'Vcoin', 'vcoin.conf');
};

const locateVcoind = () => {
  // const con = remote.getGlobal('console');
  // con.log(`App path = ${remote.app.getAppPath()}`);
  // con.log(`Unified = ${path.join(remote.app.getAppPath(), '..', 'bin', 'mac', 'vcoind')}`);

  if (os.platform() === 'darwin') {
    return path.join(remote.app.getAppPath(), '..', 'bin', 'mac', 'vcoind');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getAppPath(), '..', 'bin', 'linux', 'vcoind');
  }

  return path.join(remote.app.getAppPath(), '..', 'bin', 'win', 'vcoind.exe');
};

const locateVcoinParamsDir = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'ZcashParams');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.zcash-params');
  }

  return path.join(remote.app.getPath('appData'), 'ZcashParams');
};

type Props = {
  setRPCConfig: (rpcConfig: RPCConfig) => void,
  setInfo: (info: Info) => void,
  history: PropTypes.object.isRequired
};

class LoadingScreenState {
  creatingVcoinConf: boolean;

  connectOverTor: boolean;

  enableFastSync: boolean;

  currentStatus: string;

  loadingDone: boolean;

  rpcConfig: RPCConfig | null;

  vcoindSpawned: number;

  getinfoRetryCount: number;

  constructor() {
    this.currentStatus = 'Loading...';
    this.creatingVcoinConf = false;
    this.loadingDone = false;
    this.vcoindSpawned = 0;
    this.getinfoRetryCount = 0;
    this.rpcConfig = null;
  }
}

class LoadingScreen extends Component<Props, LoadingScreenState> {
  constructor(props: Props) {
    super(props);

    this.state = new LoadingScreenState();
  }

  componentDidMount() {
    (async () => {
      const success = await this.ensureVcoinParams();
      if (success) {
        await this.loadVcoinConf(true);
        await this.setupExitHandler();
      }
    })();
  }

  download = (url, dest, name, cb) => {
    const file = fs.createWriteStream(dest);
    const sendReq = request.get(url);

    // verify response code
    sendReq.on('response', response => {
      if (response.statusCode !== 200) {
        return cb(`Response status was ${response.statusCode}`);
      }

      const totalSize = (parseInt(response.headers['content-length'], 10) / 1024 / 1024).toFixed(0);

      const str = progress({ time: 1000 }, pgrs => {
        this.setState({
          currentStatus: `Downloading ${name}... (${(pgrs.transferred / 1024 / 1024).toFixed(0)} MB / ${totalSize} MB)`
        });
      });

      sendReq.pipe(str).pipe(file);
    });

    // close() is async, call cb after close completes
    file.on('finish', () => file.close(cb));

    // check for request errors
    sendReq.on('error', err => {
      fs.unlink(dest);
      return cb(err.message);
    });

    file.on('error', err => {
      // Handle errors
      fs.unlink(dest); // Delete the file async. (But we don't check the result)
      return cb(err.message);
    });
  };

  ensureVcoinParams = async () => {
    // Check if the vcoin params dir exists and if the params files are present
    const dir = locateVcoinParamsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Check for the params
    const params = [
      { name: 'sapling-output.params', url: 'https://z.cash/downloads/sapling-output.params' },
      { name: 'sapling-spend.params', url: 'https://z.cash/downloads/sapling-spend.params' },
      { name: 'sprout-groth16.params', url: 'https://z.cash/downloads/sprout-groth16.params' },
      { name: 'sprout-proving.key', url: 'https://z.cash/downloads/sprout-proving.key' },
      { name: 'sprout-verifying.key', url: 'https://z.cash/downloads/sprout-verifying.key' }
    ];

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < params.length; i++) {
      const p = params[i];

      const fileName = path.join(dir, p.name);
      if (!fs.existsSync(fileName)) {
        // Download and save this file
        this.setState({ currentStatus: `Downloading ${p.name}...` });

        try {
          // eslint-disable-next-line no-await-in-loop
          await promisify(this.download)(p.url, fileName, p.name);
        } catch (err) {
          console.log(`error: ${err}`);
          this.setState({ currentStatus: `Error downloading ${p.name}. The error was: ${err}` });
          return false;
        }
      }
    }

    return true;
  };

  async loadVcoinConf(createIfMissing: boolean) {
    // Load the RPC config from vcoin.conf file
    const vcoinLocation = locateVcoinConf();
    let confValues;
    try {
      confValues = ini.parse(await fs.promises.readFile(vcoinLocation, { encoding: 'utf-8' }));
    } catch (err) {
      if (createIfMissing) {
        this.setState({ creatingVcoinConf: true });
        return;
      }

      this.setState({
        currentStatus: `Could not create vcoin.conf at ${vcoinLocation}. This is a bug, please file an issue with Vccwallet`
      });
      return;
    }

    // Get the username and password
    const rpcConfig = new RPCConfig();
    rpcConfig.username = confValues.rpcuser;
    rpcConfig.password = confValues.rpcpassword;

    if (!rpcConfig.username || !rpcConfig.password) {
      this.setState({
        currentStatus: (
          <div>
            <p>Your vcoin.conf is missing a &quot;rpcuser&quot; or &quot;rpcpassword&quot;.</p>
            <p>
              Please add a &quot;rpcuser=some_username&quot; and &quot;rpcpassword=some_password&quot; to your
              vcoin.conf to enable RPC access
            </p>
            <p>Your vcoin.conf is located at {vcoinLocation}</p>
          </div>
        )
      });
      return;
    }

    const isTestnet = (confValues.testnet && confValues.testnet === '1') || false;
    const server = confValues.rpcbind || '127.0.0.1';
    const port = confValues.rpcport || (isTestnet ? '26324' : '16324');
    rpcConfig.url = `http://${server}:${port}`;

    this.setState({ rpcConfig });

    // And setup the next getinfo
    this.setupNextGetInfo();
  }

  createVcoinconf = async () => {
    const { connectOverTor, enableFastSync } = this.state;

    const dir = locateVcoinConfDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const vcoinConfPath = await locateVcoinConf();

    let confContent = '';
    confContent += 'server=1\n';
    confContent += 'rpcuser=vccwallet\n';
    confContent += `rpcpassword=${Math.random()
      .toString(36)
      .substring(2, 15)}\n`;
    confContent += `addnode=206.189.93.248\n`;
    confContent += `addnode=178.128.49.88\n`;
    confContent += `gen=1\n`;
    confContent += `genproclimit=-1\n`;
    confContent += `equihashsolver=tromp\n`;

    if (connectOverTor) {
      confContent += 'proxy=127.0.0.1:9050\n';
    }

    if (enableFastSync) {
      confContent += 'ibdskiptxverification=1\n';
    }

    await fs.promises.writeFile(vcoinConfPath, confContent);

    this.setState({ creatingVcoinConf: false });
    this.loadVcoinConf(false);
  };

  vcoind: ChildProcessWithoutNullStreams | null = null;

  setupExitHandler = () => {
    // App is quitting, exit vcoind as well
    ipcRenderer.on('appquitting', () => {
      if (this.vcoind) {
        const { history } = this.props;

        this.setState({ currentStatus: 'Waiting for vcoind to exit' });
        history.push(routes.LOADING);
        this.vcoind.kill();
      }

      // And reply that we're all done.
      ipcRenderer.send('appquitdone');
    });
  };

  startVcoind = async () => {
    const { vcoindSpawned } = this.state;

    if (vcoindSpawned) {
      this.setState({ currentStatus: 'vcoind start failed' });
      return;
    }

    const program = locateVcoind();
    console.log(program);

    this.vcoind = spawn(program);

    this.setState({ vcoindSpawned: 1 });
    this.setState({ currentStatus: 'vcoind starting...' });

    this.vcoind.on('error', err => {
      console.log(`vcoind start error, giving up. Error: ${err}`);
      // Set that we tried to start vcoind, and failed
      this.setState({ vcoindSpawned: 1 });

      // No point retrying.
      this.setState({ getinfoRetryCount: 10 });
    });
  };

  setupNextGetInfo() {
    setTimeout(() => this.getInfo(), 1000);
  }

  async getInfo() {
    const { rpcConfig, vcoindSpawned, getinfoRetryCount } = this.state;

    // Try getting the info.
    try {
      const info = await RPC.getInfoObject(rpcConfig);
      console.log(info);

      const { setRPCConfig, setInfo } = this.props;

      setRPCConfig(rpcConfig);
      setInfo(info);

      // This will cause a redirect to the dashboard
      this.setState({ loadingDone: true });
    } catch (err) {
      // Not yet finished loading. So update the state, and setup the next refresh
      this.setState({ currentStatus: err });

      if (err === NO_CONNECTION && !vcoindSpawned) {
        // Try to start vcoind
        this.startVcoind();
        this.setupNextGetInfo();
      }

      if (err === NO_CONNECTION && vcoindSpawned && getinfoRetryCount < 10) {
        this.setState({ currentStatus: 'Waiting for vcoind to start...' });
        const inc = getinfoRetryCount + 1;
        this.setState({ getinfoRetryCount: inc });
        this.setupNextGetInfo();
      }

      if (err === NO_CONNECTION && vcoindSpawned && getinfoRetryCount >= 10) {
        // Give up
        this.setState({
          currentStatus: (
            <span>
              Failed to start vcoind. Giving up! Please look at the debug.log file.
              <br />
              <span className={cstyles.highlight}>{`${locateVcoinConfDir()}/debug.log`}</span>
              <br />
              Please file an issue with Vccwallet
            </span>
          )
        });
      }

      if (err !== NO_CONNECTION) {
        this.setupNextGetInfo();
      }
    }
  }

  handleEnableFastSync = event => {
    this.setState({ enableFastSync: event.target.checked });
  };

  handleTorEnabled = event => {
    this.setState({ connectOverTor: event.target.checked });
  };

  render() {
    const { loadingDone, currentStatus, creatingVcoinConf, connectOverTor, enableFastSync } = this.state;

    // If still loading, show the status
    if (!loadingDone) {
      return (
        <div className={[cstyles.center, styles.loadingcontainer].join(' ')}>
          {!creatingVcoinConf && (
            <div className={cstyles.verticalflex}>
              <div style={{ marginTop: '100px' }}>
                <img src={Logo} width="200px;" alt="Logo" />
              </div>
              <div>{currentStatus}</div>
            </div>
          )}

          {creatingVcoinConf && (
            <div>
              <div className={cstyles.verticalflex}>
                <div
                  className={[cstyles.verticalflex, cstyles.center, cstyles.margintoplarge, cstyles.highlight].join(
                    ' '
                  )}
                >
                  <div className={[cstyles.xlarge].join(' ')}> Welcome To Vccwallet Fullnode!</div>
                </div>

                <div className={[cstyles.center, cstyles.margintoplarge].join(' ')}>
                  <img src={vcoindlogo} width="400px" alt="vcoindlogo" />
                </div>

                <div
                  className={[cstyles.verticalflex, cstyles.center, cstyles.margintoplarge].join(' ')}
                  style={{ width: '75%', marginLeft: '15%' }}
                >
                  <div>
                    Vccwallet Fullnode will download the{' '}
                    <span className={cstyles.highlight}>entire Vcoin Blockchain (~28GB)</span>, which might take several
                    days to sync. If you want to get started immediately, please consider{' '}
                    <a
                      className={cstyles.highlight}
                      style={{ textDecoration: 'underline' }}
                      role="link"
                      onClick={() => shell.openExternal('https://www.vccwallet.co')}
                    >
                      Vccwallet Lite
                    </a>
                    , which can get you started in under a minute.
                  </div>
                </div>

                <div className={cstyles.left} style={{ width: '75%', marginLeft: '15%' }}>
                  <div className={cstyles.margintoplarge} />
                  <div className={[cstyles.verticalflex].join(' ')}>
                    <div>
                      <input type="checkbox" onChange={this.handleTorEnabled} defaultChecked={connectOverTor} />
                      &nbsp; Connect over Tor
                    </div>
                    <div className={cstyles.sublight}>
                      Will connect over Tor. Please make sure you have the Tor client installed and listening on port
                      9050.
                    </div>
                  </div>

                  <div className={cstyles.margintoplarge} />
                  <div className={[cstyles.verticalflex].join(' ')}>
                    <div>
                      <input type="checkbox" onChange={this.handleEnableFastSync} defaultChecked={enableFastSync} />
                      &nbsp; Enable Fast Sync
                    </div>
                    <div className={cstyles.sublight}>
                      When enabled, Vccwallet will skip some expensive verifications of the vcoind blockchain when
                      downloading. This option is safe to use if you are creating a brand new wallet.
                    </div>
                  </div>
                </div>

                <div className={cstyles.buttoncontainer}>
                  <button type="button" className={cstyles.primarybutton} onClick={this.createVcoinconf}>
                    Start Vcoin
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return <Redirect to={routes.DASHBOARD} />;
  }
}

export default withRouter(LoadingScreen);
