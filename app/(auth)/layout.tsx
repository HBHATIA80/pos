export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth pages own their complete responsive layout. Keeping this wrapper neutral
  // prevents the auth shell from constraining wide desktop/mobile compositions.
  return <>{children}</>
}
