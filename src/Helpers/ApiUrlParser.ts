/**
 * Parse location
 * @param location
 * @param publicUrl
 */

export const parseLocation = (
  location: Location,
  publicUrl: string,
): [string, string] => {
  publicUrl = publicUrl.replace("/", "");
  const path = location.pathname.split("/");
  const apiPath = path.slice(0, path.indexOf(publicUrl)).join("/");
  return [
    `${location.protocol}//${location.host}${apiPath}`,
    `${apiPath}/${publicUrl}`,
  ];
};
