import { Mascot } from './Mascot'

export default function App() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <Mascot
        directions="/mascots/gv-directions.png?v=7"
        reactions="/mascots/gv-reactions.png?v=7"
        size={240}
        label="Avatar Mascot"
      />
    </main>
  )
}
