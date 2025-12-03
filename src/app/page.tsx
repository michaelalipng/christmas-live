'use client'
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, #c8e4f0 0%, #e8f4f8 50%, #f0f8fa 100%)', backgroundAttachment: 'fixed' }}>
      <div className="w-full max-w-2xl">
        <h1 className="text-5xl font-bold mb-4 text-center" style={{ color: '#D8A869', fontFamily: 'Forum, serif', fontSize: '1.6em' }}>CHRISTMAS</h1>
        <p className="text-xl font-semibold mb-8 text-center uppercase tracking-wide" style={{ color: '#385D75' }}>Live Voting</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/ascension/vote"
            className="block p-6 rounded-xl transition-all duration-200 backdrop-blur-md"
            style={{
              border: '1px solid rgba(56, 93, 117, 0.3)',
              backgroundColor: 'rgba(242, 247, 247, 0.6)',
              color: '#385D75',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
              e.currentTarget.style.color = '#385D75'
              e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Forum, serif', fontSize: '1.6em' }}>Vote</h2>
            <p className="text-sm" style={{ opacity: 0.8 }}>Cast your vote</p>
          </Link>
          <Link
            href="/moderator?campus=ascension"
            className="block p-6 rounded-xl transition-all duration-200 backdrop-blur-md"
            style={{
              border: '1px solid rgba(56, 93, 117, 0.3)',
              backgroundColor: 'rgba(242, 247, 247, 0.6)',
              color: '#385D75',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
              e.currentTarget.style.color = '#385D75'
              e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Forum, serif', fontSize: '1.6em' }}>Moderator</h2>
            <p className="text-sm" style={{ opacity: 0.8 }}>Moderator panel</p>
          </Link>
          <Link
            href="/overlay"
            className="block p-6 rounded-xl transition-all duration-200 backdrop-blur-md"
            style={{
              border: '1px solid rgba(56, 93, 117, 0.3)',
              backgroundColor: 'rgba(242, 247, 247, 0.6)',
              color: '#385D75',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
              e.currentTarget.style.color = '#385D75'
              e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Forum, serif', fontSize: '1.6em' }}>Overlay</h2>
            <p className="text-sm" style={{ opacity: 0.8 }}>Live overlay display</p>
          </Link>
          <Link
            href="/results"
            className="block p-6 rounded-xl transition-all duration-200 backdrop-blur-md"
            style={{
              border: '1px solid rgba(56, 93, 117, 0.3)',
              backgroundColor: 'rgba(242, 247, 247, 0.6)',
              color: '#385D75',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(44, 74, 97, 0.8)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(44, 74, 97, 0.5)'
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(242, 247, 247, 0.6)'
              e.currentTarget.style.color = '#385D75'
              e.currentTarget.style.borderColor = 'rgba(56, 93, 117, 0.3)'
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Forum, serif', fontSize: '1.6em' }}>Results</h2>
            <p className="text-sm" style={{ opacity: 0.8 }}>View results</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
