import { lazy, useState, Suspense } from 'react'
import './App.css'
import AuthForm from './components/AuthForm/AuthForm'

const Home = lazy(
  () => import('./components/Home/Home')
)



function App() {
  const [token, setToken] = useState<string>(
    sessionStorage.getItem('token') || ""
  )

  const loginHandler = (token: string) => {
    console.log(token);
    setToken(token);

  }
  return (
    <>
      {
        token ? 
        <Suspense fallback=
        {
          <p>Loading ...</p>
        }
        >
          <Home token={token} />
        </Suspense>
          :
        <AuthForm onLogin={loginHandler} />

      }
    </>
  )
}

export default App
