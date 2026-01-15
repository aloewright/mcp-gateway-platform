export const runtime = 'edge'

import SignIn from './sign-in'

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  )
}
