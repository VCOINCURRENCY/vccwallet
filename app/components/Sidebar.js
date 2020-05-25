// @flow
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react';
import type { Element } from 'react';
import url from 'url';
import querystring from 'querystring';
import Modal from 'react-modal';
import { withRouter } from 'react-router';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import TextareaAutosize from 'react-textarea-autosize';
import PropTypes from 'prop-types';
import styles from './Sidebar.module.css';
import cstyles from './Common.module.css';
import routes from '../constants/routes.json';
import Logo from '../assets/img/walleticon.png';
import { Info } from './AppState';
import Utils from '../utils/utils';

const ExportPrivKeyModal = ({ modalIsOpen, exportedPrivKeys, closeModal }) => {
  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      className={cstyles.modal}
      overlayClassName={cstyles.modalOverlay}
    >
      <div className={[cstyles.verticalflex].join(' ')}>
        <div className={cstyles.marginbottomlarge} style={{ textAlign: 'center' }}>
          Your Wallet Private Keys
        </div>

        <div className={[cstyles.marginbottomlarge, cstyles.center].join(' ')}>
          These are all the private keys in your wallet. Please store them carefully!
        </div>

        {exportedPrivKeys && (
          <TextareaAutosize value={exportedPrivKeys.join('\n')} className={styles.exportedPrivKeys} disabled />
        )}
      </div>

      <div className={cstyles.buttoncontainer}>
        <button type="button" className={cstyles.primarybutton} onClick={closeModal}>
          Close
        </button>
      </div>
    </Modal>
  );
};

const ImportPrivKeyModal = ({ modalIsOpen, modalInput, setModalInput, closeModal, doImportPrivKeys }) => {
  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      className={cstyles.modal}
      overlayClassName={cstyles.modalOverlay}
    >
      <div className={[cstyles.verticalflex].join(' ')}>
        <div className={cstyles.marginbottomlarge} style={{ textAlign: 'center' }}>
          Import Private Keys
        </div>

        <div className={cstyles.marginbottomlarge}>
          Please paste your private keys here (transparent address or shielded address), one line per key.
        </div>

        <div className={cstyles.well} style={{ textAlign: 'center' }}>
          <TextareaAutosize
            className={cstyles.inputbox}
            placeholder="Private Keys"
            value={modalInput}
            onChange={e => setModalInput(e.target.value)}
          />
        </div>
      </div>

      <div className={cstyles.buttoncontainer}>
        <button
          type="button"
          className={cstyles.primarybutton}
          onClick={() => {
            doImportPrivKeys();
            closeModal();
          }}
        >
          Import
        </button>
        <button type="button" className={cstyles.primarybutton} onClick={closeModal}>
          Close
        </button>
      </div>
    </Modal>
  );
};

const PayURIModal = ({
  modalIsOpen,
  modalInput,
  setModalInput,
  closeModal,
  modalTitle,
  actionButtonName,
  actionCallback
}) => {
  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      className={cstyles.modal}
      overlayClassName={cstyles.modalOverlay}
    >
      <div className={[cstyles.verticalflex].join(' ')}>
        <div className={cstyles.marginbottomlarge} style={{ textAlign: 'center' }}>
          {modalTitle}
        </div>

        <div className={cstyles.well} style={{ textAlign: 'center' }}>
          <input
            type="text"
            className={cstyles.inputbox}
            placeholder="URI"
            value={modalInput}
            onChange={e => setModalInput(e.target.value)}
          />
        </div>
      </div>

      <div className={cstyles.buttoncontainer}>
        {actionButtonName && (
          <button
            type="button"
            className={cstyles.primarybutton}
            onClick={() => {
              if (modalInput) {
                actionCallback(modalInput);
              }
              closeModal();
            }}
          >
            {actionButtonName}
          </button>
        )}

        <button type="button" className={cstyles.primarybutton} onClick={closeModal}>
          Close
        </button>
      </div>
    </Modal>
  );
};

const SidebarMenuItem = ({ name, routeName, currentRoute, iconname }) => {
  let isActive = false;

  if ((currentRoute.endsWith('app.html') && routeName === routes.HOME) || currentRoute === routeName) {
    isActive = true;
  }

  let activeColorClass = '';
  if (isActive) {
    activeColorClass = styles.sidebarmenuitemactive;
  }

  return (
    <div className={[styles.sidebarmenuitem, activeColorClass].join(' ')}>
      <Link to={routeName}>
        <span className={activeColorClass}>
          <i className={['fas', iconname].join(' ')} />
          &nbsp; &nbsp;
          {name}
        </span>
      </Link>
    </div>
  );
};

type Props = {
  location: PropTypes.object.isRequired,
  info: Info,
  addresses: string[],
  setSendTo: (address: string, amount: number | null, memo: string | null) => void,
  getPrivKeyAsString: (address: string) => string,
  importPrivKeys: (keys: string[]) => void,
  history: PropTypes.object.isRequired,
  openErrorModal: (title: string, body: string | Element<'div'> | Element<'span'>) => void,
  closeErrorModal: () => void
};

type State = {
  uriModalIsOpen: boolean,
  uriModalInputValue: string | null,
  privKeyModalIsOpen: boolean,
  privKeyInputValue: string | null,
  exportPrivKeysModalIsOpen: boolean,
  exportedPrivKeys: string[] | null
};

class Sidebar extends PureComponent<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      uriModalIsOpen: false,
      uriModalInputValue: null,
      privKeyModalIsOpen: false,
      exportPrivKeysModalIsOpen: false,
      exportedPrivKeys: null,
      privKeyInputValue: null
    };

    this.setupMenuHandlers();
  }

  // Handle menu items
  setupMenuHandlers = async () => {
    const { info, setSendTo, history, openErrorModal, closeErrorModal } = this.props;
    const { testnet } = info;

    // About
    ipcRenderer.on('about', () => {
      openErrorModal(
        'Vccwallet Fullnode',
        <div className={cstyles.verticalflex}>
          <div className={cstyles.margintoplarge}>Vccwallet Fullnode v0.9.10</div>
          <div className={cstyles.margintoplarge}>Built with Electron. Copyright (c) 2018-2020, Aditya Kulkarni.</div>
          <div className={cstyles.margintoplarge}>
            The MIT License (MIT) Copyright (c) 2018-present Vccwallet
            <br />
            <br />
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
            documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including
            without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
            copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
            following conditions:
            <br />
            <br />
            The above copyright notice and this permission notice shall be included in all copies or substantial
            portions of the Software.
            <br />
            <br />
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
            NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
            NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
            IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
            USE OR OTHER DEALINGS IN THE SOFTWARE.
          </div>
        </div>
      );
    });

    // Donate button
    ipcRenderer.on('donate', () => {
      setSendTo(
        Utils.getDonationAddress(testnet),
        Utils.getDefaultDonationAmount(testnet),
        Utils.getDefaultDonationMemo(testnet)
      );

      history.push(routes.SEND);
    });

    // Pay URI
    ipcRenderer.on('payuri', (event, uri) => {
      this.openURIModal(uri);
    });

    // Import Private Keys
    ipcRenderer.on('import', () => {
      this.openImportPrivKeyModal(null);
    });

    // Export all private keys
    ipcRenderer.on('exportall', async () => {
      // There might be lots of keys, so we get them serially.

      // Get all the addresses and run export key on each of them.
      const { addresses, getPrivKeyAsString } = this.props;

      // We'll do an array iteration rather than a async array.map, because there might
      // be several keys, and we don't want to hammer vcoind with 100s of RPC calls.
      const exportedPrivKeys = [];
      // eslint-disable-next-line no-restricted-syntax
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        // eslint-disable-next-line no-await-in-loop
        const privKey = await getPrivKeyAsString(address);
        exportedPrivKeys.push(`${privKey} #${address}`);

        // Show a progress dialog
        openErrorModal(
          'Exporting Private Keys',
          <span>
            Exporting Private Keys
            <br />
            Please wait...({i} / {addresses.length})
          </span>
        );
      }

      closeErrorModal();
      this.setState({ exportPrivKeysModalIsOpen: true, exportedPrivKeys });
    });

    // View vcoind
    ipcRenderer.on('vcoind', () => {
      history.push(routes.VCOIND);
    });

    // Connect mobile app
    ipcRenderer.on('connectmobile', () => {
      history.push(routes.CONNECTMOBILE);
    });
  };

  closeExportPrivKeysModal = () => {
    this.setState({ exportPrivKeysModalIsOpen: false, exportedPrivKeys: null });
  };

  openImportPrivKeyModal = (defaultValue: string | null) => {
    const privKeyInputValue = defaultValue || '';
    this.setState({ privKeyModalIsOpen: true, privKeyInputValue });
  };

  setImprovPrivKeyInputValue = (privKeyInputValue: string) => {
    this.setState({ privKeyInputValue });
  };

  closeImportPrivKeyModal = () => {
    this.setState({ privKeyModalIsOpen: false });
  };

  openURIModal = (defaultValue: string | null) => {
    const uriModalInputValue = defaultValue || '';
    this.setState({ uriModalIsOpen: true, uriModalInputValue });
  };

  doImportPrivKeys = () => {
    const { importPrivKeys, openErrorModal } = this.props;
    const { privKeyInputValue } = this.state;

    // eslint-disable-next-line no-control-regex
    if (privKeyInputValue) {
      // eslint-disable-next-line no-control-regex
      let keys = privKeyInputValue.split(new RegExp('[\n\r]+'));
      if (!keys || keys.length === 0) {
        openErrorModal('No Keys Imported', 'No keys were specified, so none were imported');
        return;
      }

      // Filter out empty lines and clean up the private keys
      keys = keys.filter(k => !(k.trim().startsWith('#') || k.trim().length === 0));

      // Special case.
      // Sometimes, when importing from a paperwallet or such, the key is split by newlines, and might have
      // been pasted like that. So check to see if the whole thing is one big private key
      if (Utils.isValidSaplingPrivateKey(keys.join(''))) {
        keys = [keys.join('')];
      }

      importPrivKeys(keys);
    }
  };

  setURIInputValue = (uriModalInputValue: string) => {
    this.setState({ uriModalInputValue });
  };

  closeURIModal = () => {
    this.setState({ uriModalIsOpen: false });
  };

  payURI = (uri: string) => {
    console.log(`Paying ${uri}`);
    const { openErrorModal, setSendTo, history } = this.props;

    const errTitle = 'URI Error';
    const errBody = (
      <span>
        The URI &quot;{escape(uri)}&quot; was not recognized.
        <br />
        Please type in a valid URI of the form &quot; vcoin:address?amout=xx&memo=yy &quot;
      </span>
    );

    if (!uri || uri === '') {
      openErrorModal(errTitle, errBody);
      return;
    }

    const parsedUri = url.parse(uri);
    if (!parsedUri || parsedUri.protocol !== 'vcoin:' || !parsedUri.query) {
      openErrorModal(errTitle, errBody);
      return;
    }

    const address = parsedUri.host;
    if (!address || !(Utils.isTransparent(address) || Utils.isZaddr(address))) {
      openErrorModal(errTitle, <span>The address ${address} was not recognized as a Vcoin address</span>);
      return;
    }

    const parsedParams = querystring.parse(parsedUri.query);
    if (!parsedParams || (!parsedParams.amt && !parsedParams.amount)) {
      openErrorModal(errTitle, errBody);
      return;
    }

    const amount = parsedParams.amt || parsedParams.amount;
    const memo = parsedParams.memo || '';

    setSendTo(address, amount, memo);
    history.push(routes.SEND);
  };

  render() {
    const { location, info } = this.props;
    const {
      uriModalIsOpen,
      uriModalInputValue,
      privKeyModalIsOpen,
      privKeyInputValue,
      exportPrivKeysModalIsOpen,
      exportedPrivKeys
    } = this.state;

    let state = 'DISCONNECTED';
    let progress = 100;
    if (info && info.version && !info.disconnected) {
      if (info.verificationProgress < 0.9999) {
        state = 'SYNCING';
        progress = (info.verificationProgress * 100).toFixed(1);
      } else {
        state = 'CONNECTED';
      }
    }

    return (
      <div>
        {/* Payment URI Modal */}
        <PayURIModal
          modalInput={uriModalInputValue}
          setModalInput={this.setURIInputValue}
          modalIsOpen={uriModalIsOpen}
          closeModal={this.closeURIModal}
          modalTitle="Pay URI"
          actionButtonName="Pay URI"
          actionCallback={this.payURI}
        />

        {/* Payment URI Modal */}
        <ImportPrivKeyModal
          modalIsOpen={privKeyModalIsOpen}
          setModalInput={this.setImprovPrivKeyInputValue}
          modalInput={privKeyInputValue}
          closeModal={this.closeImportPrivKeyModal}
          doImportPrivKeys={this.doImportPrivKeys}
        />

        {/* Exported (all) Private Keys */}
        <ExportPrivKeyModal
          modalIsOpen={exportPrivKeysModalIsOpen}
          exportedPrivKeys={exportedPrivKeys}
          closeModal={this.closeExportPrivKeysModal}
        />

        <div className={[cstyles.center, styles.sidebarlogobg].join(' ')}>
          <img src={Logo} width="70" alt="logo" />
        </div>

        <div className={styles.sidebar}>
          <SidebarMenuItem
            name="Dashboard"
            routeName={routes.DASHBOARD}
            currentRoute={location.pathname}
            iconname="fa-home"
          />
          <SidebarMenuItem
            name="Send"
            routeName={routes.SEND}
            currentRoute={location.pathname}
            iconname="fa-paper-plane"
          />
          <SidebarMenuItem
            name="Receive"
            routeName={routes.RECEIVE}
            currentRoute={location.pathname}
            iconname="fa-download"
          />
          <SidebarMenuItem
            name="Transactions"
            routeName={routes.TRANSACTIONS}
            currentRoute={location.pathname}
            iconname="fa-list"
          />
          <SidebarMenuItem
            name="Address Book"
            routeName={routes.ADDRESSBOOK}
            currentRoute={location.pathname}
            iconname="fa-address-book"
          />
        </div>

        <div className={cstyles.center}>
          {state === 'CONNECTED' && (
            <div className={[cstyles.padsmallall, cstyles.margintopsmall, cstyles.blackbg].join(' ')}>
              <i className={[cstyles.green, 'fas', 'fa-check'].join(' ')} />
              &nbsp; Connected
            </div>
          )}
          {state === 'SYNCING' && (
            <div className={[cstyles.padsmallall, cstyles.margintopsmall, cstyles.blackbg].join(' ')}>
              <div>
                <i className={[cstyles.yellow, 'fas', 'fa-sync'].join(' ')} />
                &nbsp; Syncing
              </div>
              <div>{`${progress}%`}</div>
            </div>
          )}
          {state === 'DISCONNECTED' && (
            <div className={[cstyles.padsmallall, cstyles.margintopsmall, cstyles.blackbg].join(' ')}>
              <i className={[cstyles.red, 'fas', 'fa-times-circle'].join(' ')} />
              &nbsp; Connected
            </div>
          )}
        </div>
      </div>
    );
  }
}

// $FlowFixMe
export default withRouter(Sidebar);
