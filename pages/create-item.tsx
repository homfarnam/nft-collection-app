import { useState } from 'react';
import { ethers } from 'ethers';
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { useRouter } from 'next/router';
import Web3Modal from 'web3modal';
// import { nftAddress, nftMarketAddress } from '../config';
import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import MARKET from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json';

// @ts-ignore
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0');

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: '',
    name: '',
    description: ''
  });
  const router = useRouter();

  const nftAddress =
    process.env.nftAddress || process.env.NEXT_PUBLIC_NFT_ADDRESS;
  const nftMarketAddress =
    process.env.nftMarketAddress || process.env.NEXT_PUBLIC_NFT_MARKET_ADDRESS;

  async function onChange(e) {
    const file = e.target.files[0];
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`)
      });
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      setFileUrl(url);
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  }
  async function createMarket() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl
    });
    try {
      const added = await client.add(data);
      console.log('added: ', added);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      createSale(url);
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  }

  async function createSale(url) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* next, create the item */
    try {
      let contract = new ethers.Contract(nftAddress, NFT.abi, signer);
      let transaction = await contract.createToken(url);
      let tx = await transaction.wait();
      let event = tx.events[0];
      let value = event.args[2];
      let tokenId = value.toNumber();

      const price = ethers.utils.parseUnits(formInput.price, 'ether');

      /* then list the item for sale on the marketplace */
      contract = new ethers.Contract(nftMarketAddress, MARKET.abi, signer);
      let listingPrice = await contract.getListingPrice();
      listingPrice = listingPrice.toString();

      transaction = await contract.createMarketItem(
        nftAddress,
        tokenId,
        price,
        {
          value: listingPrice
        }
      );
      await transaction.wait();
      router.push('/');
    } catch (error) {
      console.log('error create market: ', JSON.stringify(error?.message));
    }
  }

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-1/2 pb-12">
        <input
          placeholder="Asset Name"
          className="p-4 mt-8 border rounded"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="p-4 mt-2 border rounded"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="p-4 mt-2 border rounded"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="mt-4 rounded" width="350" src={fileUrl} />}
        <button
          onClick={createMarket}
          className="p-4 mt-4 font-bold text-white bg-pink-500 rounded shadow-lg"
        >
          Create Digital Asset
        </button>
      </div>
    </div>
  );
}
