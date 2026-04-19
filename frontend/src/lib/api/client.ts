// export async function apiPost(path: string, body?: any) {
//   // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
//   //   method: "POST",
//   //   headers: { "Content-Type": "application/json" },
//   //   credentials: "include",
//   //   body: JSON.stringify(body),
//   // });
//   const options = {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     credentials: "include",
//     ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
//   };
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, options);

//   if (!res.ok) {
//     throw new Error(`API error: ${res.status}`);
//   }

//   return res.json();
// }
export async function apiPost(path: string, body?: any) {
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", 
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, options);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
