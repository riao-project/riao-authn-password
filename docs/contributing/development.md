# Development

## Quick Start

Run the example with `npm start` to test the library in action.

## Building

### Debug Builds

To compile a debug build, run:

```bash
npm run build
```

The build output will appear in the `./dist` folder.

### Production Builds

To compile a production build, run:

```bash
npm run script publish
```

The build output will appear in the `./dist/src` folder.

## Testing

Run the full test suite with linting and coverage:

```bash
npm test
```

Run tests only (without linting):

```bash
npm run test:run
```

Run tests in development mode with file watching:

```bash
npm run test:dev
```

## Scripts

You can write custom scripts in the `scripts/` directory. See `scripts/example.ts` as an example.

Run your script with:

```bash
npm run script -- example
```

## Available Commands

- `npm run build` - Compile TypeScript
- `npm start` - Run the example
- `npm test` - Run full test suite with linting and coverage
- `npm run lint` - Run ESLint
- `npm run lint:prod` - Run ESLint with production configuration
- `npm run format` - Format code with Prettier
- `npm run doc` - Generate TypeDoc documentation (output: `docs/typedoc`)

## Generating Documentation

To generate API documentation, run:

```bash
npm run doc
```

Then browse `docs/typedoc/index.html` in your browser!
