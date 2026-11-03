import { LoginForm } from "@/components/LoginForm";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm nextPath={nextPath} />;
}
