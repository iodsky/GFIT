export const SHARED_PACKAGE_NAME = '@gfit/shared' as const;

export type SharedPackageStatus = {
  readonly packageName: typeof SHARED_PACKAGE_NAME;
};