import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>ホーム画面</h1>
      <Link href="/login">ログインページへ</Link>
    </div>
  );
}
