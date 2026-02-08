'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="p-4 bg-green-900 text-white rounded-lg shadow-xl">
        <p className="text-sm">✅ 연결 성공</p>
        <p className="text-xl font-bold">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <button
          onClick={() => disconnect()}
          className="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          지갑 연결 해제
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="bg-neon-green hover:bg-neon-green-dark text-black font-extrabold py-3 px-6 rounded-lg shadow-neon transition duration-200"
      style={{
        backgroundColor: '#00FF94',
        color: '#0A0A0A',
        fontSize: '1.2rem'
      }}
    >
      KAUS 지갑 연결
    </button>
  )
}
