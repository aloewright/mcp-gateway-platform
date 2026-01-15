export const runtime = 'edge'

import SignUp from './sign-up'

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <SignUp />
    </div>
  )
}
