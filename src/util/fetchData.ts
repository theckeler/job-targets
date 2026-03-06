export async function fetchData(resource: string) {
  const res = await fetch(resource);
  const data = await res.json();
  return data;
}
