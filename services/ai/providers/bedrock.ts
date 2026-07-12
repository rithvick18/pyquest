import { BaseProvider } from './base';
import { AIRequestContext, AIResponse, ProviderMetadata, ProviderStatus } from '../types';
import { ConfigService } from '../config';
import { AuthenticationError, ProviderError } from '../types/errors';

export class AWSBedrockProvider extends BaseProvider {
  public metadata: ProviderMetadata = {
    id: 'bedrock',
    name: 'AWS Bedrock',
    capabilities: {
      vision: true,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  public async generateContent(context: AIRequestContext): Promise<AIResponse> {
    const config = ConfigService.get();
    const accessKeyId = config.providers.bedrock.accessKeyId;
    const secretAccessKey = config.providers.bedrock.secretAccessKey;

    if (!accessKeyId || !secretAccessKey) {
      throw new AuthenticationError(
        'AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are missing for AWS Bedrock.',
        'bedrock'
      );
    }

    // In a real environment, we'd sign the request using AWS Signature V4 and send it to:
    // https://bedrock-runtime.${region}.amazonaws.com/model/${modelName}/invoke
    // We throw a descriptive error indicating that Bedrock is configured but requires AWS signing middleware or SDK.
    throw new ProviderError(
      'AWS Bedrock invocation requires AWS Signature V4 signing, which is not fully supported in this lightweight REST client. Please use standard AWS SDK or an alternative provider.',
      'bedrock'
    );
  }

  public async getStatus(config?: any): Promise<ProviderStatus> {
    const configData = ConfigService.get();
    const accessKeyId = configData.providers.bedrock.accessKeyId;
    if (!accessKeyId) {
      return 'DISABLED';
    }
    return 'ACTIVE';
  }
}
