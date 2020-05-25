/* eslint-disable no-unused-vars */
/* eslint-disable no-else-return */
/* eslint-disable no-plusplus */
export const NO_CONNECTION: string = 'Could not connect to vcoind';

export default class Utils {
  static isSapling(addr: string): boolean {
    if (!addr) return false;
    return new RegExp('^z[a-z0-9]{77}$').test(addr) || new RegExp('^ztestsapling[a-z0-9]{76}$').test(addr);
  }

  static isSprout(addr: string): boolean {
    if (!addr) return false;
    return new RegExp('^z[a-zA-Z0-9]{94}$').test(addr);
  }

  static isZaddr(addr: string): boolean {
    if (!addr) return false;
    return Utils.isSapling(addr) || Utils.isSprout(addr);
  }

  static isTransparent(addr: string): boolean {
    if (!addr) return false;
    return new RegExp('^V[a-zA-Z0-9]{34}$').test(addr);
  }

  static isValidSaplingPrivateKey(key: string): boolean {
    return (
      new RegExp('^secret-extended-key-test[0-9a-z]{278}$').test(key) ||
      new RegExp('^secret-extended-key-main[0-9a-z]{278}$').test(key)
    );
  }

  // Convert to max 8 decimal places, and remove trailing zeros
  static maxPrecision(v: number): string {
    if (!v) return v;

    if (typeof v === 'string' || v instanceof String) {
      // eslint-disable-next-line no-param-reassign
      v = parseFloat(v);
    }

    return v.toFixed(8);
  }

  static maxPrecisionTrimmed(v: number): string {
    let s = Utils.maxPrecision(v);
    if (!s) {
      return s;
    }

    while (s.indexOf('.') >= 0 && s.substr(s.length - 1, 1) === '0') {
      s = s.substr(0, s.length - 1);
    }

    if (s.substr(s.length - 1) === '.') {
      s = s.substr(0, s.length - 1);
    }

    return s;
  }

  static splitVccAmountIntoBigSmall(vccValue: number) {
    if (!vccValue) {
      return { bigPart: vccValue, smallPart: '' };
    }

    let bigPart = Utils.maxPrecision(vccValue);
    let smallPart = '';

    if (bigPart.indexOf('.') >= 0) {
      const decimalPart = bigPart.substr(bigPart.indexOf('.') + 1);
      if (decimalPart.length > 4) {
        smallPart = decimalPart.substr(4);
        bigPart = bigPart.substr(0, bigPart.length - smallPart.length);

        // Pad the small part with trailing 0s
        while (smallPart.length < 4) {
          smallPart += '0';
        }
      }
    }

    if (smallPart === '0000') {
      smallPart = '';
    }

    return { bigPart, smallPart };
  }

  static splitStringIntoChunks(s: string, numChunks: number) {
    if (numChunks > s.length) return [s];
    if (s.length < 16) return [s];

    const chunkSize = Math.round(s.length / numChunks);
    const chunks = [];
    for (let i = 0; i < numChunks - 1; i++) {
      chunks.push(s.substr(i * chunkSize, chunkSize));
    }
    // Last chunk might contain un-even length
    chunks.push(s.substr((numChunks - 1) * chunkSize));

    return chunks;
  }

  static nextToAddrID: number = 0;

  static getNextToAddrID(): number {
    // eslint-disable-next-line no-plusplus
    return Utils.nextToAddrID++;
  }

  static getDefaultFee(): number {
    return 0.0001;
  }

  static getDonationAddress(testnet: boolean): string {
    if (testnet) {
      return 'ztestsapling1wn6889vznyu42wzmkakl2effhllhpe4azhu696edg2x6me4kfsnmqwpglaxzs7tmqsq7kudemp5';
    } else {
      return 'zs1gv64eu0v2wx7raxqxlmj354y9ycznwaau9kduljzczxztvs4qcl00kn2sjxtejvrxnkucw5xx9u';
    }
  }

  static getDefaultDonationAmount(testnet: boolean): number {
    return 0.1;
  }

  static getDefaultDonationMemo(testnet: boolean): string {
    return 'Thanks for supporting Vccwallet!';
  }

  static getVccToUsdString(price: number | null, vccValue: number | null): string {
    if (!price || !vccValue) {
      return 'USD --';
    }

    return `USD ${(price * vccValue).toFixed(2)}`;
  }
}
