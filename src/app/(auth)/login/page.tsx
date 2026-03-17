import { LoginFormClient } from "./login-form"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LoginPage({ 
  searchParams,
}: { 
  searchParams: SearchParams
}) {
  return <LoginFormClient />
}
