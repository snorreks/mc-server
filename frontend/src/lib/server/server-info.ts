export async function getServerInfo() {
  return {
    online: 0,
    max: 20,
    difficulty: 'normal',
    viewDistance: 12,
    gamemode: 'survival',
  };
}
