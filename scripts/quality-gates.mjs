import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const gates = [
  {
    name: 'BRD policy module exists',
    pass: () => existsSync(join(root, 'src/server/domain/goal-policy.ts')),
  },
  {
    name: 'Database schema exists',
    pass: () => existsSync(join(root, 'prisma/schema.prisma')),
  },
  {
    name: 'Audit trigger migration exists',
    pass: () => existsSync(join(root, 'prisma/migrations/0001_governance_constraints.sql')),
  },
  {
    name: 'No default create-next-app README remains',
    pass: () => !readFileSync(join(root, 'README.md'), 'utf8').includes('bootstrapped with'),
  },
  {
    name: 'No Inter/Geist default font claims',
    pass: () => {
      const files = ['src/app/globals.css', 'README.md'];
      return files.every((file) => {
        const content = readFileSync(join(root, file), 'utf8');
        return !/\b(Inter|Geist|Roboto)\b/i.test(content);
      });
    },
  },
  {
    name: 'Evaluation matrix exists',
    pass: () => existsSync(join(root, 'docs/EVALUATION_MATRIX.md')),
  },
];

const failures = gates.filter((gate) => !gate.pass());

for (const gate of gates) {
  console.log(`${failures.includes(gate) ? 'FAIL' : 'PASS'} ${gate.name}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
