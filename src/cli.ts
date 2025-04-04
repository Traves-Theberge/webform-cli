#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as scraper from './scraper';
import * as schemaLoader from './schemaLoader';
import * as configManager from './configManager';
import * as output from './output';
import { formatStructuredOutput, formatWithGemini, processWithGemini } from './formatter';
import 'dotenv/config'; // Load environment variables

// Define proper types for argv
interface CommandArguments {
  [x: string]: unknown;
  _: string[];
  $0: string;
  url?: string;
  schema?: string;
  output?: "json" | "text";
  save?: string;
  llmOutput?: boolean;
  schema_name?: string;
  key?: string;
  value?: unknown;
  structured?: boolean;
  includeMetadata?: boolean;
}

// Create the CLI parser
const yargsInstance = yargs(hideBin(process.argv))
  .scriptName('webform')
  .usage('$0 <command> [options]')
  .command('scrape <url>', 'Initiate scraping of the specified URL', (yargs) => {
    return yargs
      .positional('url', {
        describe: 'The URL to scrape',
        type: 'string',
      })
      .option('schema', {
        alias: 's',
        describe: 'The schema to use for data extraction',
        type: 'string',
      })
      .option('output', {
        alias: 'o',
        describe: 'Output format (json or text)',
        choices: ['json', 'text'],
        default: 'json',
      })
      .option('save', {
        alias: 'f',
        describe: 'File path to save the output',
        type: 'string',
      })
      .option('llm-output', {
        describe: 'Send raw extracted data to Gemini for processing',
        type: 'boolean',
        default: false,
      })
      .option('structured', {
        describe: 'Use structured output format with schema validation',
        type: 'boolean',
        default: false,
      })
      .option('include-metadata', {
        describe: 'Include metadata in the structured output',
        type: 'boolean',
        default: true,
      })
      .example('$0 scrape https://example.com --schema article', 'Scrape example.com with the article schema')
      .example('$0 scrape https://example.com --schema product --save output.json', 'Scrape and save to a file');
  }, async (argv) => {
    // Handler for scrape command
    try {
      if (!argv.url) {
        console.error('URL is required for scraping');
        process.exit(1);
      }
      
      const html = await scraper.fetchHTML(argv.url);
      const outputFormat = argv.output as "json" | "text" || "json";
      
      // Use structured output if specified
      if (argv.structured) {
        try {
          if (!argv.schema) {
            console.error('Schema is required for structured output');
            process.exit(1);
          }
          
          // Load structured schema
          const structuredSchema = await schemaLoader.loadStructuredSchema(argv.schema);
          
          // Extract data with structured schema
          const extractedData = scraper.extractDataWithStructuredSchema(html, structuredSchema);
          
          if (argv.llmOutput) {
            // Send to Google AI for additional processing
            const response = await processWithGemini(extractedData);
            await output.outputFormattedData(response, outputFormat, argv.save as string | undefined);
          } else {
            // Format according to structured schema
            const formattedData = await formatStructuredOutput(extractedData, structuredSchema.structure || {});
            
            // Output the structured data
            await output.outputStructuredData(
              formattedData, 
              outputFormat,
              argv.save as string | undefined,
              { includeMetadata: argv.includeMetadata !== false }
            );
          }
        } catch (error) {
          console.error('Error processing with structured schema:', error);
          process.exit(1);
        }
      } else {
        // Traditional non-structured approach
        try {
          let schema = null;
          if (argv.schema) {
            // First try to load as structured schema
            try {
              const structuredSchema = await schemaLoader.loadStructuredSchema(argv.schema);
              // Extract data with structured schema
              const extractedData = scraper.extractDataWithStructuredSchema(html, structuredSchema);
              
              if (argv.llmOutput) {
                const response = await processWithGemini(extractedData);
                await output.outputFormattedData(response, outputFormat, argv.save as string | undefined);
              } else {
                // Convert extractedData to string format for the formatter function which expects strings
                const simplerData: Record<string, string> = {};
                for (const key in extractedData) {
                  if (key !== '_metadata') {
                    simplerData[key] = String(extractedData[key]);
                  }
                }
                
                // Create a simplified schema for the formatter
                const simplerSchema: Record<string, string> = {};
                for (const key in structuredSchema.selectors) {
                  simplerSchema[key] = String(structuredSchema.selectors[key]);
                }
                
                const formattedData = await formatWithGemini(simplerData, simplerSchema);
                await output.outputFormattedData(formattedData, outputFormat, argv.save as string | undefined);
              }
              return;
            } catch (structuredError) {
              // If loading as structured schema fails, try simple schema
              console.warn('Could not load as structured schema, trying simple schema');
              schema = await schemaLoader.loadSchema(argv.schema);
            }
          }
          
          // Simple schema extraction
          const extractedData = schema ? scraper.extractData(html, schema) : {};
          
          if (argv.llmOutput) {
            const response = await processWithGemini(extractedData);
            await output.outputFormattedData(response, outputFormat, argv.save as string | undefined);
          } else {
            const formattedData = await formatWithGemini(extractedData, schema);
            await output.outputFormattedData(formattedData, outputFormat, argv.save as string | undefined);
          }
        } catch (error) {
          console.error('Error during extraction:', error);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('Error during scraping:', error);
      process.exit(1);
    }
  })
  .command('schema', 'Manage schemas', (yargs) => {
    return yargs
      .command('list', 'List available schemas', {}, async () => {
        try {
          const schemas = await schemaLoader.listSchemas();
          console.log('Available schemas:', schemas);
        } catch (error) {
          console.error('Error listing schemas:', error);
          process.exit(1);
        }
      })
      .command('view <schema_name>', 'View a specific schema', (yargs) => {
        return yargs.positional('schema_name', {
          describe: 'The name of the schema to view',
          type: 'string',
          demandOption: true
        });
      }, async (argv) => {
        try {
          if (argv.schema_name) {
            const schemaContent = await schemaLoader.viewSchema(argv.schema_name as string);
            console.log(schemaContent);
          }
        } catch (error) {
          console.error('Error viewing schema:', error);
          process.exit(1);
        }
      })
      .demandCommand(1, 'You must specify a subcommand for schema management')
      .example('$0 schema list', 'List all available schemas')
      .example('$0 schema view article', 'View the article schema');
  })
  .command('config', 'Manage configuration', (yargs) => {
    return yargs
      .command('set <key> <value>', 'Set a configuration value', {}, async (argv) => {
        try {
          if (argv.key && argv.value) {
            await configManager.setConfig(argv.key as string, argv.value as string);
            console.log(`Configuration set: ${argv.key} = ${argv.value}`);
          }
        } catch (error) {
          console.error('Error setting configuration:', error);
          process.exit(1);
        }
      })
      .demandCommand(1, 'You must specify a subcommand for config management')
      .example('$0 config set gemini_api_key YOUR_API_KEY', 'Set your Google AI API key');
  })
  .command('test <url>', 'Test extraction without using Gemini API', (yargs) => {
    return yargs
      .positional('url', {
        describe: 'The URL to scrape',
        type: 'string',
      })
      .option('schema', {
        alias: 's',
        describe: 'The schema to use for data extraction',
        type: 'string',
        default: 'article'
      })
      .option('output', {
        alias: 'o',
        describe: 'Output format (json or text)',
        choices: ['json', 'text'],
        default: 'json',
      })
      .option('save', {
        alias: 'f',
        describe: 'File path to save the output',
        type: 'string',
      })
      .example('$0 test https://news.ycombinator.com', 'Test extraction from Hacker News');
  }, async (argv) => {
    try {
      if (!argv.url) {
        console.error('URL is required for testing');
        process.exit(1);
      }
      
      console.log(`Testing extraction from ${argv.url} with schema ${argv.schema}`);
      const html = await scraper.fetchHTML(argv.url);
      const outputFormat = argv.output as "json" | "text" || "json";
      
      // Try to load the schema
      try {
        const structuredSchema = await schemaLoader.loadStructuredSchema(argv.schema as string);
        console.log('Using structured schema:', structuredSchema.selectors);
        
        // Extract data without formatting
        const extractedData = scraper.extractDataWithStructuredSchema(html, structuredSchema);
        
        // Output the raw extracted data
        await output.outputStructuredData(
          extractedData,
          outputFormat,
          argv.save as string | undefined,
          { includeMetadata: true }
        );
        
        console.log('Extraction completed successfully');
      } catch (error) {
        console.error('Error loading schema or extracting data:', error);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error during testing:', error);
      process.exit(1);
    }
  })
  .demandCommand(1, 'You must specify a command to run')
  .strict()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue('For more information, visit https://github.com/yourusername/webform-cli');

// Execute the CLI
yargsInstance.parse();