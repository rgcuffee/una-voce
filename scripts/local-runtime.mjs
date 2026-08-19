const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

export function isPrivateIpv4(address) {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(address));
}

export function privateLanAddresses(interfaces) {
  return [...new Set(
    Object.values(interfaces)
      .flatMap((entries) => entries ?? [])
      .filter((entry) =>
        entry &&
        entry.family === 'IPv4' &&
        !entry.internal &&
        isPrivateIpv4(entry.address),
      )
      .map((entry) => entry.address),
  )].sort();
}

export function localDevelopmentUrls({ interfaces, lan, port }) {
  const localUrl = `http://127.0.0.1:${port}`;
  const lanUrls = lan
    ? privateLanAddresses(interfaces).map((address) => `http://${address}:${port}`)
    : [];

  return { localUrl, lanUrls };
}
