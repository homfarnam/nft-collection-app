import Link from 'next/link';
import Layout from '../components/Layout';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal';
import { NextPage } from 'next';
import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import MARKET from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json';

const IndexPage: NextPage = () => {
  const [nfts, setNfts] = useState<any>([]);
  const [loading, setLoading] = useState('not-loaded');

  const nftAddress =
    process.env.nftAddress || process.env.NEXT_PUBLIC_NFT_ADDRESS;
  const nftMarketAddress =
    process.env.nftMarketAddress || process.env.NEXT_PUBLIC_NFT_MARKET_ADDRESS;

  const loadNFTs = async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const tokenContract = new ethers.Contract(nftAddress, NFT.abi, provider);
    const marketContract = new ethers.Contract(
      nftMarketAddress,
      MARKET.abi,
      provider
    );

    try {
      const data = await marketContract?.fetchMarketItems();

      console.log('data: ', data);

      const items = await Promise.all(
        data.map(async (i) => {
          const tokenURI = await tokenContract.tokenURI(i.tokenId);
          const meta = await axios.get(tokenURI);
          let price = ethers.utils.formatUnits(i.price.toString(), 'ether');

          let item = {
            price,
            itemId: i.itemId.toNumber(),
            seller: i.seller,
            owner: i.owner,
            image: meta.data.image,
            name: meta.data.name,
            description: meta.data.description
          };

          return item;
        })
      );
      setNfts(items);
      setLoading('loaded');
    } catch (error) {
      console.log('error fetch items: ', error);
    }
  };

  const buyNFTs = async (nft) => {
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const signer = provider.getSigner();

    const contract = new ethers.Contract(nftMarketAddress, MARKET.abi, signer);
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');

    const transaction = await contract.createMarketSale(
      nftAddress,
      nft.itemId,
      {
        value: price
      }
    );

    await transaction.wait();

    loadNFTs();
  };

  useEffect(() => {
    loadNFTs();
  }, []);

  if (loading === 'loaded' && !nfts.length) {
    return <h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>;
  }

  return (
    <Layout title="Metaverse | Home">
      <div className="flex justify-center">
        <div className="px-4" style={{ maxWidth: '1600px' }}>
          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {nfts.map((nft, i) => (
              <div key={i} className="overflow-hidden border shadow rounded-xl">
                <img src={nft.image} />
                <div className="p-4">
                  <p
                    style={{ height: '64px' }}
                    className="text-2xl font-semibold"
                  >
                    {nft.name}
                  </p>
                  <div style={{ height: '70px', overflow: 'hidden' }}>
                    <p className="text-gray-400">{nft.description}</p>
                  </div>
                </div>
                <div className="p-4 bg-black">
                  <p className="mb-4 text-2xl font-bold text-white">
                    {nft.price} ETH
                  </p>
                  <button
                    className="w-full px-12 py-2 font-bold text-white bg-pink-500 rounded"
                    onClick={() => buyNFTs(nft)}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IndexPage;
