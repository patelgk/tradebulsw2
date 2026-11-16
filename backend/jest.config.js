/**
 * Jest Configuration for Proprupee Backend
 * Used for testing mock payment gateway and demo adapters
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '**/src/adapters/mock-payment/__tests__/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/adapters/mock-payment/**/*.ts',
    '!src/adapters/mock-payment/__tests__/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
