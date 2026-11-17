
import { BlockList, isIP } from "node:net";

type RangeEntry = readonly [string, number];

const IPV4_BLOCKED_RANGES: readonly RangeEntry[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_BLOCKED_RANGES: readonly RangeEntry[] = [
  ["::", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const blockList = new BlockList();

for (const [network, prefix] of IPV4_BLOCKED_RANGES) {
  blockList.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of IPV6_BLOCKED_RANGES) {
  blockList.addSubnet(network, prefix, "ipv6");
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return blockList.check(address, "ipv4");
  }
  if (family === 6) {
    return blockList.check(address, "ipv6");
  }
  return true;
}


