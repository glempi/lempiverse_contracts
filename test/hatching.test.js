const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const hre = require("hardhat");
const BigNumber = hre.ethers.BigNumber;

const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;



describe('Hatching', function () {

  let LempiverseHatching;
  let VRFCoordinatorV2Mock;
  let Garbage;
  let LempiverseChildMintableERC1155;
  let HatchingDistributionTest;


  let garbage;
  let hatching;
  let token;
  let vrfCoordinator;

  let chainId;

  const tokenId = "11";

  const mumbayKeyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";

  const distribIds = [1000, 1001, 1002];
  const distribWeights = [10, 20, 30];


  let adminRole;

  let vrfSubId;


  const privKey1 = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const key1 = Uint8Array.from(Buffer.from(privKey1, "hex"));

  async function getOper() {
    const [_, oper] = await hre.ethers.getSigners();
    return oper;
  }

  async function getOperAddress() {
    return await(await getOper()).getAddress();
  }

  async function getAdmin() {
    const [admin] = await hre.ethers.getSigners();
    return admin;
  }

  async function getAdminAddress() {
    return await(await getAdmin()).getAddress();
  }

  const capturePayment = (value) => {
    console.log("capturePayment", value);
    return true
  }

  const checkDistrib = async (tokenId, ids, weights) => {

    expect(weights.length).to.equal(ids.length);
    const distrib = await hatching.getDistribution(tokenId);
    expect(distrib.tokenIds.length).to.equal(weights.length);
    expect(distrib.weights.length).to.equal(weights.length);

    var total = 0;
    for (var i=0; i<distrib.tokenIds.length; i++) {
      expect(distrib.tokenIds[i]).to.equal(ids[i]);
      expect(distrib.weights[i]).to.equal(weights[i]);
      total += distrib.weights[i];
    }
    expect(distrib.total).to.equal(total);
  }

  beforeEach(async function () {

    LempiverseHatching = await hre.ethers.getContractFactory('LempiverseHatching');
    VRFCoordinatorV2MockEx = await hre.ethers.getContractFactory('VRFCoordinatorV2MockEx');
    Garbage = await hre.ethers.getContractFactory('Garbage');
    LempiverseChildMintableERC1155 = await hre.ethers.getContractFactory('LempiverseChildMintableERC1155');
    HatchingDistributionTest = await hre.ethers.getContractFactory('HatchingDistributionTest');


    garbage = await Garbage.deploy();
    vrfCoordinator = await VRFCoordinatorV2MockEx.deploy(1, 1);
    token = await LempiverseChildMintableERC1155.deploy('0x0000000000000000000000000000000000000000');
    hatching = await LempiverseHatching.deploy(vrfCoordinator.address, token.address, garbage.address);
    hatchingDistribution = await HatchingDistributionTest.deploy();


    await vrfCoordinator.createSubscription();
    vrfSubId = await vrfCoordinator.getLastSubscription();
    await vrfCoordinator.fundSubscription(vrfSubId.toString(), 1000_000_000_000);
    await vrfCoordinator.addConsumer(vrfSubId.toString(), hatching.address);

    await hatching.setupVRF(2500000, 3, mumbayKeyHash, vrfSubId.toString());


    await hatching.setupDistribution(tokenId, distribIds, distribWeights);

    chainId = parseInt(await token.getChainId());

    adminRole = await token.DEFAULT_ADMIN_ROLE();

    await token.grantRole(adminRole, hatching.address);

  });



  it('distribution setup and get', async function () {

      const newTokenId = 11111;
      const unexistsTokenId = 99999;
      const ids = [10000, 10001, 10002, 10003];
      const weights = [1, 2, 3, 4];

      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(newTokenId)).to.be.equal(false);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);

      await hatching.setupDistribution(newTokenId, ids, weights);
      expect(await hatching.canHatch(newTokenId)).to.be.equal(true);
      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);


      await checkDistrib(newTokenId, ids, weights);
      await checkDistrib(tokenId, distribIds, distribWeights);
      await checkDistrib(unexistsTokenId, [], []);

      await hatching.setupDistribution(newTokenId, [], []);

      await checkDistrib(newTokenId, [], []);
      await checkDistrib(tokenId, distribIds, distribWeights);
      await checkDistrib(unexistsTokenId, [], []);

      expect(await hatching.canHatch(newTokenId)).to.be.equal(false);
      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);
  })

  async function baseFlow(rnds, pattern, withDisableHatch=false) {

    await garbage.setup(true);
    await hatching.setupEggsBulkLimit(200);

    const oper = await getOperAddress();

    const num = rnds.length;

    distribIds.map(async (x) => { expect(await token.totalSupply(x)).to.be.equal(0) } )
    expect(await token.totalSupply(tokenId)).to.be.equal(0);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    distribIds.map(async (x) => { expect(await token.balanceOf(oper, x)).to.be.equal(0); } )

    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);


    await token.mint(oper, tokenId, num, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num);

    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    await token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, num, 0x0);

    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num);
    distribIds.map(async (x) => { expect(await token.balanceOf(oper, x)).to.be.equal(0); } )

    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
    distribIds.map(async (x) => { expect(await token.totalSupply(x)).to.be.equal(0); } )

    expect(await hatching.canHatch(tokenId)).to.be.equal(true);
    if (withDisableHatch) {
      await hatching.setupDistribution(tokenId, [], []);

      expect(await hatching.canHatch(tokenId)).to.be.equal(false);
    }

    const reqId = 1;

    await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId, hatching.address, rnds))
        .to.emit(vrfCoordinator, "RandomWordsFulfilled")
        .withArgs(reqId, reqId, anyValue, true)

    // console.log(await Promise.all(distribIds.map(async x => token.balanceOf(oper, x) )))

    const checkDistribPattern = async (f) => {
      expect(await Promise.all(distribIds.map(async x => await f(x) ))).to.deep.equal(pattern);
    }


    expect(await token.balanceOf(oper, tokenId)).to.be.equal(withDisableHatch ? num : 0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    await checkDistribPattern(async x => await token.balanceOf(oper, x));
    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    await checkDistribPattern(async x => await token.totalSupply(x));
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(withDisableHatch ? 0 : num);

    if (!withDisableHatch) {

      await garbage.burn(token.address, [tokenId]);
      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);

      expect(await token.totalSupply(tokenId)).to.be.equal(0);

      await checkDistribPattern(async x => await token.totalSupply(x));
    }
  }

  it('base flow 1', async function () {
    await baseFlow([1], [1,0,0])
  })

  it('base flow 2', async function () {
    await baseFlow([1, 1], [2,0,0])
  })

  it('base flow 5', async function () {
    await baseFlow([1,1,1,1,1], [5,0,0])
  })

  it('base flow 5-321', async function () {
    await baseFlow([1,11,12,1,50], [2,2,1])
  })

  it('base flow 5-401', async function () {
    await baseFlow([1,8,8,1,50], [4,0,1])
  })

  it('base flow 5-041', async function () {
    await baseFlow([14,18,18,17,50], [0,4,1])
  })

  it('base flow 5-050', async function () {
    await baseFlow([14,18,18,17,14], [0,5,0])
  })

  it('base flow 5-005', async function () {
    await baseFlow([54,58,58,57,54], [0,0,5])
  })

  it('return egg back 100', async function () {
    await baseFlow([1], [0,0,0], true)
  })

  it('return egg back 111', async function () {
    await baseFlow([1,18,50], [0,0,0], true)
  })

  it('return egg back 131', async function () {
    await baseFlow([1,18,18,18,50], [0,0,0], true)
  })


  it('HatchingDistribution', async function () {
    this.timeout(100000);  //add timeout.
    const srcIds = [1000, 2000, 3000, 4000, 5000];
    const srcWeights = [10, 0, 20, 1, 100];


    const src = srcWeights.reduce(function(result, field, index) {
      result[srcIds[index]] = field;
      return result;
    }, {})

    const total = srcWeights.reduce((result, field) => result + field, 0 );

    console.log("please waiting for long test...");

    hatchingDistribution.setupDistribution(tokenId, srcIds, srcWeights);
    expect(await hatchingDistribution.canHatch(tokenId)).to.be.equal(true);
    expect(await hatchingDistribution.canHatch(9999)).to.be.equal(false);

    const distrib = await hatchingDistribution.getDistribution(tokenId);

    expect(total).to.be.equal(distrib.total);

    var acc = {}
    for (var k in src) {
      acc[k] = 0;
    }

    const mult = 5;

    for (var i=0; i<distrib.total*mult; i++) {
      const choice = await hatchingDistribution.makeChoice(tokenId, i);
      acc[choice] ++;
      // console.log(i, choice.toString());
    }
    // console.log(acc);

    for (var k in src) {
      // console.log(k, src[k], acc[k]);
      expect(src[k] * mult).to.be.equal(acc[k]);
    }
  })


  it('test ERC1155Receiver errors', async function () {

    const oper = await getOperAddress();

    const num = 300;

    expect(await token.totalSupply(tokenId)).to.be.equal(0);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    expect(await hatching.eggsBulkLimit()).to.be.equal(0);


    await token.mint(oper, tokenId, num, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    await expect(token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, 1, 0x0))
        .to.be.revertedWith("ERC1155: transfer to non ERC1155Receiver implementer");

    const eggsBulkLimit = 200;
    await hatching.setupEggsBulkLimit(eggsBulkLimit);
    expect(await hatching.eggsBulkLimit()).to.be.equal(eggsBulkLimit);
    expect(await hatching.canHatch(tokenId)).to.be.equal(true);

    await expect(token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, num, 0x0))
        .to.be.revertedWith("ERC1155: transfer to non ERC1155Receiver implementer");

    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    await token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, 200, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(100);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(200);

    await expect(token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, num, 0x0))
        .to.be.revertedWith("ERC1155: insufficient balance for transfer");

    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(100);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(200);


    await hatching.setupDistribution(tokenId, [], []);
    expect(await hatching.canHatch(tokenId)).to.be.equal(false);

    await expect(token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, 100, 0x0))
        .to.be.revertedWith("ERC1155: transfer to non ERC1155Receiver implementer");

    await hatching.setupDistribution(tokenId, distribIds, distribWeights);
    expect(await hatching.canHatch(tokenId)).to.be.equal(true);

    await token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, 100, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num);
  })

  it('test wrong transfer callback', async function () {
    const oper = await getOperAddress();
    await expect(hatching.onERC1155Received(oper, oper, tokenId, 1, 0x0))
      .to.be.revertedWithCustomError(hatching, 'OnlySpecificErc1155CallerAllowed');

    await expect(hatching.onERC1155BatchReceived(oper, oper, [tokenId, tokenId+1], [1,2], 0x0))
      .to.be.revertedWithCustomError(hatching, 'OnlySpecificErc1155CallerAllowed');
  })

  async function fillToken(num, oper, initInHatching) {

    const operAddress = await oper.getAddress();

    const initSupply = parseInt(await token.totalSupply(tokenId));
    await token.mint(operAddress, tokenId, num, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num+initSupply);
    expect(await token.balanceOf(operAddress, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(initInHatching);

    expect(await hatching.canHatch(tokenId)).to.be.equal(true);

    await token.connect(oper).safeTransferFrom(operAddress, hatching.address, tokenId, num, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num+initSupply);
    expect(await token.balanceOf(operAddress, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num+initInHatching);
  }


  it('rescue tokens owner', async function () {
    const num = 1;
    const operAddress = await getOperAddress();
    await hatching.setupEggsBulkLimit(200);
    await fillToken(num, await getOper(), 0);

    const [_, __, oper2] = await hre.ethers.getSigners();
    const oper2Address = await(await oper2).getAddress();

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);

    const reqId = 1;
    await expect(hatching.connect(oper2).rescue(reqId))
      .to.be.revertedWithCustomError(hatching, 'NotTokenOwnerToRescue');

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);

    await hatching.connect(await getOper()).rescue(reqId);

    const oper = await getOperAddress();

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId, hatching.address, [1]))
        .to.emit(vrfCoordinator, "RandomWordsFulfilled")
        .withArgs(reqId, reqId, anyValue, false)

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.totalSupply(tokenId)).to.be.equal(num);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

  })


  it('rescue tokens admin with two users', async function () {
    const num = 3;
    const num2 = 2;
    await garbage.setup(true);
    await hatching.setupEggsBulkLimit(200);

    const operAddress = await getOperAddress();
    await fillToken(num, await getOper(), 0);

    const adminAddress = await getAdminAddress();


    const [_, __, oper2] = await hre.ethers.getSigners();
    const oper2Address = await(await oper2).getAddress();

    await token.mint(oper2Address, tokenId, num2, 0x0);

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(num2);
    expect(await token.balanceOf(adminAddress, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);

    await token.connect(oper2).safeTransferFrom(oper2Address, hatching.address, tokenId, num2, 0x0);
    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(adminAddress, tokenId)).to.be.equal(0);

    const reqId = 1;

    await expect(hatching.connect(await getAdmin()).rescue(3))
      .to.be.revertedWithCustomError(hatching, 'WrongReqId');

    await expect(hatching.connect(oper2).rescue(3))
      .to.be.revertedWithCustomError(hatching, 'WrongReqId');


    await hatching.connect(await getAdmin()).rescue(reqId);


    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.totalSupply(tokenId)).to.be.equal(num2+num);
    expect(await token.balanceOf(operAddress, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num2);
    expect(await token.balanceOf(adminAddress, tokenId)).to.be.equal(0);

    await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId, hatching.address, [1,2,3]))
        .to.emit(vrfCoordinator, "RandomWordsFulfilled")
        .withArgs(reqId, reqId, anyValue, false)

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.totalSupply(tokenId)).to.be.equal(num2+num);
    expect(await token.balanceOf(operAddress, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num2);
    expect(await token.balanceOf(adminAddress, tokenId)).to.be.equal(0);

    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);

    expect(await Promise.all(distribIds.map(async x => await token.balanceOf(oper2Address, x) ))).to.deep.equal([0,0,0]);

    await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId+1, hatching.address, [1,2]))
        .to.emit(vrfCoordinator, "RandomWordsFulfilled")
        .withArgs(reqId+1, reqId+1, anyValue, true)
        .to.emit(hatching, "startHatch")

    expect(await token.balanceOf(oper2Address, tokenId)).to.be.equal(0);
    expect(await token.totalSupply(tokenId)).to.be.equal(num+num2);
    expect(await token.balanceOf(operAddress, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(num2);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(adminAddress, tokenId)).to.be.equal(0);

    expect(await Promise.all(distribIds.map(async x => await token.balanceOf(oper2Address, x) ))).to.deep.equal([2,0,0]);
  })

  it('many users', async function () {

    await garbage.setup(true);
    await hatching.setupEggsBulkLimit(200);
    const signers = await hre.ethers.getSigners();




    var opers = [];
    var operAddressess = [];

    var num = 1;
    var total = 0;
    for (var i=3; i<7; i++,num++) {
      opers.push(signers[i]);
      operAddressess.push(await(await signers[i]).getAddress());
      await fillToken(num, signers[i], total);
      total += num;
    }

    expect(await token.totalSupply(tokenId)).to.be.equal(total);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(total);

    for (var addr of operAddressess) {
      expect(await token.balanceOf(addr, tokenId)).to.be.equal(0);
    }

    rnds = []
    for (var reqId = 1; reqId<opers.length+1; reqId++ ) {
      rnds.push(reqId);
      await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId, hatching.address, rnds))
          .to.emit(vrfCoordinator, "RandomWordsFulfilled")
          .withArgs(reqId, reqId, anyValue, true)
          .to.emit(hatching, "startHatch")
    }

    expect(await token.totalSupply(tokenId)).to.be.equal(total);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(total);

    num = 1;
    for (var addr of operAddressess) {
      expect(await token.balanceOf(addr, tokenId)).to.be.equal(0);
      expect(await Promise.all(distribIds.map(async x => await token.balanceOf(addr, x) ))).to.deep.equal([num,0,0]);
      num++;
    }

  })


})

