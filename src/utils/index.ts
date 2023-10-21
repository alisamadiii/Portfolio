function getLastNameRoute(url: string): string {
  // Split the URL by '/'
  const parts = url.split("/");
  // Get the last part (route)
  const lastNameRoute = parts[parts.length - 1];
  return lastNameRoute;
}

function convertingBytes(value: number): string {
  const kilobytes = value / 1024;

  if (kilobytes <= 1204) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export { getLastNameRoute, convertingBytes };
