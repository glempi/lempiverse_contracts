const ethSigUtil = require('eth-sig-util');
const { fromRpcSig, toBuffer } = require('ethereumjs-util');

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];


const MetaTransaction = [
  { name: 'nonce', type: 'uint256' },
  { name: 'from', type: 'address' },
  { name: 'functionSignature', type: 'bytes' }
];


const VERSION="1";

function domainSeparator (name, verifyingContract, salt) {
  return '0x' + ethSigUtil.TypedDataUtils.hashStruct(
    'EIP712Domain',
    { name, version:VERSION, verifyingContract, salt },
    { EIP712Domain },
  ).toString('hex');
}



function encodeIntAsByte32(digit) {
  var array = new Array(32).fill(0);
  var n = digit
  for (var i = 0; i<4; i++) {
      array[31-i] = n & 0xff
      n >>= 8
  }
  return array;
}


const buildPermitData = (name, version, salt, verifyingContract, owner, spender, value, nonce, deadline) => ({
  primaryType: 'Permit',
  types: { EIP712Domain, Permit },
  domain: { name, version, verifyingContract, salt },
  message: { owner, spender, value, nonce, deadline },
});

function calcPermitVRS (name, key, buyer, paymentToken, minter, value, nonce, chainId, deadline) {
  const data = buildPermitData(name, VERSION, 
                               encodeIntAsByte32(chainId), 
                               paymentToken, buyer, minter, 
                               value, nonce, deadline);

  const signature = ethSigUtil.signTypedMessage(key, { data });
  return fromRpcSig(signature);
};



function calcMetaTxVRS (name, key, from, contract, functionSignature, nonce, chainId) {

  const data = {
    primaryType: 'MetaTransaction',
    types: { EIP712Domain, MetaTransaction },
    domain: { name, version:VERSION, verifyingContract:contract, salt:encodeIntAsByte32(chainId) },
    message: { nonce, from, functionSignature },
  };

  const signature = ethSigUtil.signTypedMessage(key, { data });
  return fromRpcSig(signature);
};


module.exports = {
  calcMetaTxVRS,
  calcPermitVRS,
  encodeIntAsByte32,
  EIP712Domain,
  Permit,
  domainSeparator,
};
