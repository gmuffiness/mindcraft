import OpenAIApi from 'openai';
import { getKey, hasKey } from '../utils/keys.js';
import { strictFormat } from '../utils/text.js';

export class GPT {
    constructor(model_name, url, isAzure = false) {
        this.model_name = model_name;
        this.isAzure = isAzure;

        let config = {};

        if (this.isAzure) {
            // Azure OpenAI settings
            config.apiKey = getKey('AZURE_OPENAI_API_KEY');
            config.baseURL = `${url}/openai/deployments/${model_name}`;
            config.defaultQuery = { 'api-version': getKey('AZURE_OPENAI_VERSION') };
            config.defaultHeaders = { 'api-key': getKey('AZURE_OPENAI_API_KEY') };
        } else {
            // OpenAI settings
            if (url) config.baseURL = url;
            if (hasKey('OPENAI_ORG_ID')) config.organization = getKey('OPENAI_ORG_ID');
            config.apiKey = getKey('OPENAI_API_KEY');
        }

        this.openai = new OpenAIApi(config);
    }

    async sendRequest(turns, systemMessage, stop_seq='***') {
        let messages = [{'role': 'system', 'content': systemMessage}].concat(turns);

        const pack = {
            messages,
            stop: stop_seq,
        };

        if (!this.isAzure) {
            pack.model = this.model_name || "gpt-3.5-turbo";
        }

        if (!this.isAzure && this.model_name.includes('o1')) {
            pack.messages = strictFormat(messages);
            delete pack.stop;
        }

        let res = null;
        try {
            console.log(`Awaiting ${this.isAzure ? 'Azure ' : ''} OpenAI api response...`);
            let completion = await this.openai.chat.completions.create(pack);
            if (completion.choices[0].finish_reason == 'length')
                throw new Error('Context length exceeded'); 
            console.log('Received.')
            res = completion.choices[0].message.content;
        }
        catch (err) {
            if ((err.message == 'Context length exceeded' || err.code == 'context_length_exceeded') && turns.length > 1) {
                console.log('Context length exceeded, trying again with shorter context.');
                return await this.sendRequest(turns.slice(1), systemMessage, stop_seq);
            } else {
                console.log(err);
                res = 'My brain disconnected, try again.';
            }
        }
        return res;
    }

    async embed(text) {
        const embedding = await this.openai.embeddings.create({
            model: this.model_name || "text-embedding-3-small",
            input: text,
            encoding_format: "float",
        });
        return embedding.data[0].embedding;
    }
}



