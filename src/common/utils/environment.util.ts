export const isProductionEnvironment = () => {
  const environment = (process.env.ENV ?? '').toLowerCase();

  return environment === 'prod' || environment === 'production';
};
