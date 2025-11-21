#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as scraper from './scraper';
import * as schemaLoader from './schemaLoader';
import * as configManager from './configManager';
import * as output from './output';
import { formatStructuredOutput, formatWithGemini, processWithGemini } from './formatter';
import { validateUrl, validateFilePath } from './validation';
import 'dotenv/config'; // Load environment variables
import figlet from 'figlet';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

// Define types for command arguments (for documentation and validation)
// Note: yargs handlers use 'any' for pragmatic reasons, but we enforce types at runtime
interface ScrapeCommandArguments {
  url: string;
  schema?: string;
  output?: "json" | "text";
  save?: string;
  llmOutput?: boolean;
  structured?: boolean;
  includeMetadata?: boolean;
  retry?: number;
  verbose?: boolean;
}

interface TestCommandArguments {
  url: string;
  schema: string;
  output?: "json" | "text";
  save?: string;
  verbose?: boolean;
}

interface SchemaViewArguments {
  schema_name: string;
  verbose?: boolean;
}

interface SchemaValidateArguments {
  schema_name: string;
  verbose?: boolean;
}

interface ConfigSetArguments {
  key: string;
  value: string;
  verbose?: boolean;
}

// Process arguments to detect help mode
const args = process.argv.slice(2);
const isBasicHelpMode = 
  args.includes('--help') || 
  args.includes('-h') || 
  args.length === 0 || 
  args[0] === 'help';

// Only show banner when NOT in basic help mode 
if (!isBasicHelpMode) {
  // Display ASCII art banner
  console.log(
    chalk.cyan(
      figlet.textSync('WebForm CLI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
      })
    )
  );

  // Welcome message in a box
  console.log(
    boxen(
      chalk.green('Web Scraping Made Easy with Schema-Driven Extraction'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    )
  );
}

// Helper for spinner creation
const createSpinner = (text: string) => {
  return ora({
    text,
    color: 'cyan',
    spinner: 'dots'
  });
};

// Define command groups for organization
const COMMAND_GROUPS = {
  SCRAPING: 'Scraping Commands:',
  SCHEMA: 'Schema Management:',
  CONFIG: 'Configuration:',
  UTILITY: 'Utility Commands:'
};

// Create a more comprehensive tutorial with examples
const customTutorial = () => {
  return `
${chalk.bold.cyan('WebForm CLI - Schema-driven Web Scraping Tool')}
${chalk.cyan('-------------------------------------------')}

${chalk.bold('USAGE')}
  ${chalk.yellow('webform')} ${chalk.green('<command>')} ${chalk.cyan('[options]')}

${chalk.bold('COMMANDS')}
  ${chalk.green('scrape')} <url>         Extract data from a webpage using a schema
  ${chalk.green('schema')}               Manage data extraction schemas
    ${chalk.cyan('list')}                List all available schemas
    ${chalk.cyan('view')} <schema>       View schema definition
    ${chalk.cyan('validate')} <schema>   Validate a schema against meta-schema
  ${chalk.green('config')}               Manage CLI configuration
    ${chalk.cyan('set')} <key> <value>   Set a configuration value
    ${chalk.cyan('view')}                View current configuration
  ${chalk.green('test')} <url>           Test extraction without AI processing
  ${chalk.green('tutorial')}             Show this tutorial and usage examples

${chalk.bold('GLOBAL OPTIONS')}
  ${chalk.yellow('--help, -h')}          Show help for a command
  ${chalk.yellow('--version, -v')}       Show version information
  ${chalk.yellow('--verbose')}           Show detailed logs during execution

${chalk.bold('GETTING STARTED TUTORIAL')}
  ${chalk.cyan('1. Set up your API key')}
     WebForm CLI uses Google's Gemini API for advanced data processing.
     Get your API key from Google AI Studio and set it:
     ${chalk.yellow('webform config set gemini_api_key YOUR_API_KEY')}

  ${chalk.cyan('2. View available schemas')}
     Schemas define how data is extracted from websites:
     ${chalk.yellow('webform schema list')}

  ${chalk.cyan('3. Examine a schema')}
     Look at the selectors used in a specific schema:
     ${chalk.yellow('webform schema view article')}

  ${chalk.cyan('4. Test extraction without AI')}
     Try extracting data without AI processing:
     ${chalk.yellow('webform test https://news.ycombinator.com')}

  ${chalk.cyan('5. Full extraction with AI formatting')}
     Extract data and process it with Gemini:
     ${chalk.yellow('webform scrape https://example.com --schema article')}

${chalk.bold('COMMON EXAMPLES')}
  ${chalk.cyan('• Basic scraping:')}
     ${chalk.yellow('webform scrape https://example.com --schema article')}

  ${chalk.cyan('• Save output to file:')}
     ${chalk.yellow('webform scrape https://example.com --schema product --save product-data.json')}

  ${chalk.cyan('• Structured output with validation:')}
     ${chalk.yellow('webform scrape https://developer.mozilla.org --schema article --structured')}

  ${chalk.cyan('• Retry on network failures:')}
     ${chalk.yellow('webform scrape https://example.com --retry 3')}

  ${chalk.cyan('• View your current configuration:')}
     ${chalk.yellow('webform config view')}

${chalk.bold('SCHEMA EXAMPLES')}
  ${chalk.cyan('• The "article" schema')} is designed for news and blog content
  ${chalk.cyan('• The "product" schema')} works well with e-commerce product pages
  ${chalk.cyan('• The "default" schema')} is a general-purpose extraction schema

${chalk.bold('TIPS & TRICKS')}
  ${chalk.cyan('• Use --verbose')} for detailed logging during extraction
  ${chalk.cyan('• Add --structured')} for better data validation
  ${chalk.cyan('• Create custom schemas')} by adding JSON files to the schemas/ directory
  ${chalk.cyan('• Use --retry')} when scraping less reliable websites

${chalk.bold('NEED HELP WITH A SPECIFIC COMMAND?')}
  Run ${chalk.yellow('webform <command> --help')} for detailed information about a command
`;
};

// Create the CLI parser
const yargsInstance = yargs(hideBin(process.argv))
  .scriptName('webform')
  .usage(chalk.cyan('\nUsage: $0 <command> [options]'))
  .wrap(yargs.terminalWidth())
  // Common options that apply across commands
  .option('verbose', {
    alias: 'v',
    describe: 'Show detailed logs during execution',
    type: 'boolean',
    global: true
  })
  .command({
    command: 'scrape <url>',
    describe: chalk.green('Extract data from a webpage using a schema'),
    builder: (yargs) => {
      return yargs
        .group(['url', 'schema', 'output', 'save', 'llm-output', 'structured', 'include-metadata', 'retry'], COMMAND_GROUPS.SCRAPING)
        .positional('url', {
          describe: 'The URL to scrape',
          type: 'string',
          demandOption: true
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
        .option('retry', {
          alias: 'r',
          describe: 'Number of retry attempts for failed requests',
          type: 'number',
          default: 0,
        })
        .example(chalk.yellow('$0 scrape https://example.com --schema article'), 'Scrape an article from example.com')
        .example(chalk.yellow('$0 scrape https://example.com --schema product --save output.json'), 'Extract product data and save to a file')
        .example(chalk.yellow('$0 scrape https://example.com --structured --retry 3'), 'Extract with structured validation and retry on failure');
    }, 
    handler: async (argv: any) => { // ScrapeCommandArguments
      try {
        const url = argv.url;
        const schemaName = argv.schema || 'default';
        const outputFormat = argv.output || 'json';
        const savePath = argv.save;
        const useLLM = argv.llmOutput || false;
        const useStructured = argv.structured || false;
        const includeMetadata = argv.includeMetadata !== false;
        const retryCount = argv.retry || 0;
        const verbose = argv.verbose || false;

        // Validate URL
        try {
          validateUrl(url);
        } catch (error) {
          console.error(chalk.red(`\n✖ Invalid URL: ${error instanceof Error ? error.message : String(error)}`));
          process.exit(1);
        }

        // Validate save path if provided
        if (savePath) {
          try {
            validateFilePath(savePath);
          } catch (error) {
            console.error(chalk.red(`\n✖ Invalid file path: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
          }
        }

        if (verbose) {
          console.log(chalk.dim(`\nStarting scrape with options:`));
          console.log(chalk.dim(`  URL: ${url}`));
          console.log(chalk.dim(`  Schema: ${schemaName}`));
          console.log(chalk.dim(`  Format: ${outputFormat}`));
          console.log(chalk.dim(`  Structured: ${useStructured}`));
          console.log(chalk.dim(`  LLM Processing: ${useLLM}\n`));
        }

        // Step 1: Load schema
        const spinner = createSpinner(`Loading schema: ${chalk.yellow(schemaName)}`);
        spinner.start();

        let structuredSchema: any = null;
        let simpleSchema: Record<string, string> = {};

        try {
          if (useStructured) {
            structuredSchema = await schemaLoader.loadStructuredSchema(schemaName);
          } else {
            const loadedSchema: any = await schemaLoader.loadSchema(schemaName);
            simpleSchema = loadedSchema.selectors || loadedSchema;
          }
          spinner.succeed(chalk.green(`Schema loaded: ${schemaName}`));
        } catch (error) {
          spinner.fail(chalk.red(`Failed to load schema: ${schemaName}`));
          throw error;
        }

        // Step 2: Fetch HTML
        const fetchSpinner = createSpinner(`Fetching HTML from ${chalk.cyan(url)}`);
        fetchSpinner.start();

        let html;
        try {
          html = await scraper.fetchHTML(url, { retry: retryCount, verbose });
          fetchSpinner.succeed(chalk.green(`HTML fetched successfully (${html.length} bytes)`));
        } catch (error) {
          fetchSpinner.fail(chalk.red('Failed to fetch HTML'));
          throw error;
        }

        // Step 3: Extract data
        const extractSpinner = createSpinner('Extracting data from HTML');
        extractSpinner.start();

        let extractedData: any;
        try {
          if (useStructured && structuredSchema) {
            extractedData = scraper.extractDataWithStructuredSchema(html, structuredSchema);
          } else {
            extractedData = scraper.extractData(html, simpleSchema);
          }
          extractSpinner.succeed(chalk.green(`Data extracted (${Object.keys(extractedData).length} fields)`));

          if (verbose) {
            console.log(chalk.dim('\nRaw extracted data:'));
            console.log(chalk.dim(JSON.stringify(extractedData, null, 2)));
          }
        } catch (error) {
          extractSpinner.fail(chalk.red('Failed to extract data'));
          throw error;
        }

        // Step 4: Process with LLM if requested
        let finalOutput: any;
        if (useLLM) {
          const llmSpinner = createSpinner('Processing data with Gemini AI');
          llmSpinner.start();

          try {
            if (useStructured && structuredSchema?.structure) {
              finalOutput = await formatStructuredOutput(extractedData, structuredSchema.structure);
              llmSpinner.succeed(chalk.green('Data processed with AI (structured)'));
            } else {
              const processed = await processWithGemini(extractedData);
              finalOutput = processed;
              llmSpinner.succeed(chalk.green('Data processed with AI'));
            }
          } catch (error) {
            llmSpinner.warn(chalk.yellow('AI processing failed, using raw data'));
            console.error(chalk.dim(`Error: ${error instanceof Error ? error.message : String(error)}`));
            finalOutput = extractedData;
          }
        } else {
          finalOutput = extractedData;
        }

        // Step 5: Output results
        console.log(chalk.green('\n✓ Scraping completed successfully!\n'));

        if (useStructured && typeof finalOutput === 'object') {
          await output.outputStructuredData(
            finalOutput,
            outputFormat,
            savePath,
            { includeMetadata }
          );
        } else {
          const outputData = typeof finalOutput === 'string'
            ? finalOutput
            : JSON.stringify(finalOutput, null, 2);
          await output.outputFormattedData(outputData, outputFormat, savePath);
        }

        if (savePath) {
          console.log(chalk.green(`\n✓ Output saved to: ${chalk.cyan(savePath)}`));
        }

      } catch (error) {
        console.error(chalk.red('\n✖ Scraping failed:'), error instanceof Error ? error.message : String(error));
        if (argv.verbose) {
          console.error(chalk.dim('\nStack trace:'));
          console.error(chalk.dim(error instanceof Error ? error.stack : 'No stack trace available'));
        }
        process.exit(1);
      }
    }
  })
  .command({
    command: 'schema',
    describe: chalk.green('Manage data extraction schemas'),
    builder: (yargs) => {
      return yargs
        .group(['list', 'view', 'validate'], COMMAND_GROUPS.SCHEMA)
        .command({
          command: 'list',
          describe: 'List all available schemas',
          handler: async () => {
            try {
              const spinner = createSpinner('Listing available schemas');
              spinner.start();
              
              const schemas = await schemaLoader.listSchemas();
              spinner.succeed(chalk.green('Available schemas:'));
              
              // Display schemas in a formatted list
              if (schemas.length > 0) {
                schemas.forEach((schema, index) => {
                  console.log(chalk.cyan(` ${index + 1}. ${schema}`));
                });
              } else {
                console.log(chalk.yellow('No schemas found.'));
              }
            } catch (error) {
              console.error(chalk.red('Error listing schemas:'), error);
              process.exit(1);
            }
          }
        })
        .command({
          command: 'view <schema_name>',
          describe: 'View the definition of a specific schema',
          builder: (yargs) => {
            return yargs.positional('schema_name', {
              describe: 'The name of the schema to view',
              type: 'string',
              demandOption: true
            });
          },
          handler: async (argv: any) => { // SchemaViewArguments
            try {
              const schemaName = argv.schema_name;
              const spinner = createSpinner(`Loading schema: ${chalk.yellow(schemaName)}`);
              spinner.start();

              const schemaContent = await schemaLoader.viewSchema(schemaName);
              spinner.succeed(chalk.green(`Schema: ${schemaName}`));
                
              // Pretty print the JSON schema
              try {
                const parsedSchema = JSON.parse(schemaContent);
                console.log(boxen(
                  chalk.cyan(JSON.stringify(parsedSchema, null, 2)),
                  {
                    padding: 1,
                    borderColor: 'yellow',
                    title: `Schema: ${schemaName}`,
                    titleAlignment: 'center'
                  }
                ));
              } catch {
                console.log(chalk.yellow(schemaContent));
              }
            } catch (error) {
              console.error(chalk.red('Error viewing schema:'), error);
              process.exit(1);
            }
          }
        })
        .command({
          command: 'validate <schema_name>',
          describe: 'Validate a schema against the meta-schema definition',
          builder: (yargs) => {
            return yargs.positional('schema_name', {
              describe: 'The name of the schema to validate',
              type: 'string',
              demandOption: true
            });
          },
          handler: async (argv: any) => { // SchemaValidateArguments
            try {
              const schemaName = argv.schema_name;
              const spinner = createSpinner(`Validating schema: ${chalk.yellow(schemaName)}`);
              spinner.start();

              const validationResult = await schemaLoader.validateSchema(schemaName);

              if (validationResult.valid) {
                spinner.succeed(chalk.green(`Schema "${schemaName}" is valid`));
              } else {
                spinner.fail(chalk.red(`Schema "${schemaName}" has validation errors`));
                console.log(boxen(
                  chalk.red(JSON.stringify(validationResult.errors, null, 2)),
                  { padding: 1, borderColor: 'red', title: 'Validation Errors' }
                ));
              }
            } catch (error) {
              console.error(chalk.red('Error validating schema:'), error);
              process.exit(1);
            }
          }
        })
        .demandCommand(1, chalk.red('You must specify a subcommand for schema management'))
        .example(chalk.yellow('$0 schema list'), 'List all available schemas')
        .example(chalk.yellow('$0 schema view article'), 'View the article schema definition')
        .example(chalk.yellow('$0 schema validate product'), 'Validate the product schema');
    },
    handler: (argv) => {
      // Show help for schema command when no subcommand is provided
      if (argv._.length <= 1) {
        console.log(chalk.yellow('\nSchema Management Commands:'));
        console.log(chalk.cyan('  list') + '             - List all available schemas');
        console.log(chalk.cyan('  view <schema>') + '    - View a specific schema');
        console.log(chalk.cyan('  validate <schema>') + ' - Validate a schema');
        console.log(chalk.yellow('\nUse --help with any command for more information.\n'));
      }
    }
  })
  .command({
    command: 'config',
    describe: chalk.green('Manage WebForm CLI configuration'),
    builder: (yargs) => {
      return yargs
        .group(['set', 'view'], COMMAND_GROUPS.CONFIG)
        .command({
          command: 'set <key> <value>',
          describe: 'Set a configuration value',
          builder: (yargs) => {
            return yargs
              .positional('key', {
                describe: 'Configuration key to set',
                type: 'string',
                demandOption: true
              })
              .positional('value', {
                describe: 'Value to assign to the key',
                type: 'string',
                demandOption: true
              });
          },
          handler: async (argv: any) => { // ConfigSetArguments
            try {
              const key = argv.key;
              const value = argv.value;
              const spinner = createSpinner(`Setting configuration: ${chalk.cyan(key)}`);
              spinner.start();

              await configManager.setConfig(key, value);
              spinner.succeed(chalk.green(`Configuration set: ${key} = ${value}`));
            } catch (error) {
              console.error(chalk.red('Error setting configuration:'), error);
              process.exit(1);
            }
          }
        })
        .command({
          command: 'view',
          describe: 'View all current configuration values',
          handler: async () => {
            try {
              const spinner = createSpinner('Loading configuration');
              spinner.start();
              
              const config = await configManager.getConfig();
              spinner.succeed(chalk.green('Current configuration:'));
              
              console.log(boxen(
                chalk.cyan(JSON.stringify(config, null, 2)),
                { 
                  padding: 1, 
                  borderColor: 'green',
                  title: 'Configuration',
                  titleAlignment: 'center'
                }
              ));
            } catch (error) {
              console.error(chalk.red('Error viewing configuration:'), error);
              process.exit(1);
            }
          }
        })
        .demandCommand(1, chalk.red('You must specify a subcommand for config management'))
        .example(chalk.yellow('$0 config set gemini_api_key YOUR_API_KEY'), 'Set your Google AI API key')
        .example(chalk.yellow('$0 config view'), 'View all current configuration values');
    },
    handler: (argv) => {
      // Show help for config command when no subcommand is provided
      if (argv._.length <= 1) {
        console.log(chalk.yellow('\nConfiguration Commands:'));
        console.log(chalk.cyan('  set <key> <value>') + ' - Set a configuration value');
        console.log(chalk.cyan('  view') + '              - View all configuration values');
        console.log(chalk.yellow('\nUse --help with any command for more information.\n'));
      }
    }
  })
  .command({
    command: 'test <url>',
    describe: chalk.green('Test extraction without using AI processing'),
    builder: (yargs) => {
      return yargs
        .group(['url', 'schema', 'output', 'save'], COMMAND_GROUPS.UTILITY)
        .positional('url', {
          describe: 'The URL to scrape',
          type: 'string',
          demandOption: true
        })
        .option('schema', {
          alias: 's',
          describe: 'Schema to use for extraction (default: article)',
          type: 'string',
          default: 'article'
        })
        .option('output', {
          alias: 'o',
          describe: 'Output format',
          choices: ['json', 'text'],
          default: 'json',
        })
        .option('save', {
          alias: 'f',
          describe: 'Save output to this file',
          type: 'string',
        })
        .example(chalk.yellow('$0 test https://news.ycombinator.com'), 'Test extraction from Hacker News')
        .example(chalk.yellow('$0 test https://example.com --schema product'), 'Test product extraction');
    },
    handler: async (argv: any) => { // TestCommandArguments
      try {
        const url = argv.url;
        const schemaName = argv.schema;
        const outputFormat = argv.output || 'json';
        const savePath = argv.save;
        const verbose = argv.verbose || false;

        // Validate URL
        try {
          validateUrl(url);
        } catch (error) {
          console.error(chalk.red(`\n✖ Invalid URL: ${error instanceof Error ? error.message : String(error)}`));
          process.exit(1);
        }

        // Validate save path if provided
        if (savePath) {
          try {
            validateFilePath(savePath);
          } catch (error) {
            console.error(chalk.red(`\n✖ Invalid file path: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
          }
        }

        console.log(boxen(
          chalk.yellow('⚠️  TEST MODE') + '\n\n' +
          'This mode extracts raw data without AI processing.\n' +
          'Useful for testing selectors and debugging schemas.',
          { padding: 1, borderColor: 'yellow', title: 'Test Mode', titleAlignment: 'center' }
        ));

        if (verbose) {
          console.log(chalk.dim(`\nTest extraction with options:`));
          console.log(chalk.dim(`  URL: ${url}`));
          console.log(chalk.dim(`  Schema: ${schemaName}\n`));
        }

        // Step 1: Load schema
        const spinner = createSpinner(`Loading schema: ${chalk.yellow(schemaName)}`);
        spinner.start();

        let schema: Record<string, string> = {};
        try {
          const loadedSchema: any = await schemaLoader.loadSchema(schemaName);
          schema = loadedSchema.selectors || loadedSchema;
          spinner.succeed(chalk.green(`Schema loaded: ${schemaName}`));

          if (verbose) {
            console.log(chalk.dim('\nSchema selectors:'));
            console.log(chalk.dim(JSON.stringify(schema, null, 2)));
          }
        } catch (error) {
          spinner.fail(chalk.red(`Failed to load schema: ${schemaName}`));
          throw error;
        }

        // Step 2: Fetch HTML
        const fetchSpinner = createSpinner(`Fetching HTML from ${chalk.cyan(url)}`);
        fetchSpinner.start();

        let html;
        try {
          html = await scraper.fetchHTML(url, { retry: 0, verbose });
          fetchSpinner.succeed(chalk.green(`HTML fetched successfully (${html.length} bytes)`));
        } catch (error) {
          fetchSpinner.fail(chalk.red('Failed to fetch HTML'));
          throw error;
        }

        // Step 3: Extract raw data
        const extractSpinner = createSpinner('Extracting data with selectors');
        extractSpinner.start();

        let extractedData: any;
        try {
          extractedData = scraper.extractData(html, schema);
          const fieldCount = Object.keys(extractedData).length;
          const nonEmptyFields = Object.values(extractedData).filter(v =>
            v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
          ).length;

          extractSpinner.succeed(
            chalk.green(`Data extracted: ${nonEmptyFields}/${fieldCount} fields have values`)
          );
        } catch (error) {
          extractSpinner.fail(chalk.red('Failed to extract data'));
          throw error;
        }

        // Step 4: Display extraction summary
        console.log(chalk.green('\n✓ Test extraction completed!\n'));
        console.log(boxen(
          chalk.cyan('Extraction Summary:') + '\n\n' +
          Object.entries(extractedData)
            .map(([key, value]) => {
              const valuePreview = Array.isArray(value)
                ? `[${value.length} items]`
                : value === null || value === ''
                  ? chalk.red('(empty)')
                  : String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
              return `  ${chalk.yellow(key)}: ${valuePreview}`;
            })
            .join('\n'),
          { padding: 1, borderColor: 'cyan', title: 'Extracted Fields', titleAlignment: 'center' }
        ));

        // Step 5: Output results
        console.log(chalk.cyan('\n📋 Full extracted data:\n'));

        const outputData = JSON.stringify(extractedData, null, 2);
        await output.outputFormattedData(outputData, outputFormat, savePath);

        if (savePath) {
          console.log(chalk.green(`\n✓ Test output saved to: ${chalk.cyan(savePath)}`));
        }

        // Provide helpful tips
        console.log(chalk.dim('\n💡 Tips:'));
        console.log(chalk.dim('  • Use --verbose to see more details'));
        console.log(chalk.dim('  • Empty fields may indicate incorrect selectors'));
        console.log(chalk.dim('  • Update schema files in the schemas/ directory'));
        console.log(chalk.dim('  • Run "webform scrape" with same options to use AI processing\n'));

      } catch (error) {
        console.error(chalk.red('\n✖ Test extraction failed:'), error instanceof Error ? error.message : String(error));
        if (argv.verbose) {
          console.error(chalk.dim('\nStack trace:'));
          console.error(chalk.dim(error instanceof Error ? error.stack : 'No stack trace available'));
        }
        process.exit(1);
      }
    }
  })
  .command({
    command: 'tutorial',
    aliases: ['turorial', 'tutor', 'guide', 'learn'],
    describe: chalk.green('Show tutorial and usage examples'),
    builder: (yargs) => yargs,
    handler: () => {
      // Display the custom tutorial
      console.log(customTutorial());
      
      // Provide additional interactive guidance
      console.log(boxen(
        chalk.green('🚀 Need more help? Try these resources:') + '\n\n' +
        chalk.cyan('• Documentation: ') + 'https://github.com/Traves-Theberge/webform-cli\n' +
        chalk.cyan('• Command help: ') + 'Use --help with any command\n' +
        chalk.cyan('• Example schemas: ') + 'Check the schemas/ directory',
        { padding: 1, borderColor: 'blue', title: 'Additional Resources', titleAlignment: 'center' }
      ));
    }
  })
  .demandCommand(1, chalk.red('\nYou must specify a command to run. Use --help for more information.'))
  .strict()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue(
    chalk.cyan(`For documentation visit: https://github.com/Traves-Theberge/webform-cli`)
  )
  .fail((msg, err) => {
    // Display a more friendly error message
    console.error(chalk.red(`\n✖ ${msg || err.message}`));
    console.log(chalk.yellow('\nUse --help for available options and command examples.\n'));
    process.exit(1);
  });

// If using basic help mode (--help, -h, or no args), show custom tutorial instead of yargs default
if (isBasicHelpMode && args[0] !== 'tutorial') {
  console.log(customTutorial());
  process.exit(0);
}

// Execute the CLI
yargsInstance.parse();