import path from 'path';
import { config } from 'dotenv';

import { GeminiProvider } from './nlp/LLMProvider';
import { ClassificationEngine } from './nlp/ClassificationEngine';

config({ path: path.resolve(__dirname, '../.env') });

const runTest = async () => {
  try {
    console.log('Starting NLP Test...\n');

    // ----------------------------------------------------------------------
    // CHECK API KEY
    // ----------------------------------------------------------------------

    console.log('Gemini Key Loaded:', !!process.env.GEMINI_API_KEY);
    console.log('Gemini Model:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');

    // ----------------------------------------------------------------------
    // USING REAL GEMINI PROVIDER
    // ----------------------------------------------------------------------

    const llm = new GeminiProvider(process.env.GEMINI_API_KEY!);

    const engine = new ClassificationEngine(llm);

    const messages = [
      'Can you send me the report?',
      "I'll finish the project by tomorrow",
      'Hey long time no talk!',
      'Thanks for your help',
    ];

    for (const msg of messages) {
      console.log('\n====================================');
      console.log('INPUT:', msg);

      const result = await engine.classify(msg);

      console.log('\nFINAL OUTPUT:');
      console.log(JSON.stringify(result, null, 2));
    }

    console.log('\nNLP Test Completed Successfully');
  } catch (error) {
    console.error('\nTEST FAILED:\n');
    console.error(error);
  }
};

runTest();
