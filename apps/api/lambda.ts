import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from './app';

let cachedServer: ReturnType<typeof serverlessExpress> | null = null;

async function loadSsmEnvVar(
  client: SSMClient,
  envName: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY',
  parameterEnvName: 'SUPABASE_URL_PARAM' | 'SUPABASE_SERVICE_ROLE_KEY_PARAM',
): Promise<void> {
  if (process.env[envName]) {
    return;
  }

  const parameterName = process.env[parameterEnvName];
  if (!parameterName) {
    return;
  }

  const result = await client.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    })
  );

  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(`Missing SSM parameter value for ${parameterName}`);
  }

  process.env[envName] = value;
}

async function bootstrapServer() {
  const ssmClient = new SSMClient({});
  await loadSsmEnvVar(ssmClient, 'SUPABASE_URL', 'SUPABASE_URL_PARAM');
  await loadSsmEnvVar(ssmClient, 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY_PARAM');

  const app = createApp();
  return serverlessExpress({ app });
}

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }

  return cachedServer(event, context, () => undefined);
};

