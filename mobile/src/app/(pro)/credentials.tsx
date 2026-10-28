import { Body, Card, Screen, Title } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import type { CredentialType } from '@/domain/catalog';
import { isCredentialValid } from '@/domain/rules';
import { CREDENTIAL_LABELS, DEMO_PRO_CREDENTIALS } from '@/lib/demo';

const today = () => new Date().toISOString().slice(0, 10);

export default function Credentials() {
  const c = usePalette();
  const types = Object.keys(CREDENTIAL_LABELS) as CredentialType[];

  return (
    <Screen>
      <Title>Documents</Title>
      <Body secondary>
        Each job type unlocks only when the documents it needs are checked and in date.
      </Body>
      {types.map((type) => {
        const held = DEMO_PRO_CREDENTIALS.find((cred) => cred.type === type);
        const valid = held ? isCredentialValid(held, today()) : false;
        return (
          <Card key={type}>
            <Body style={{ fontWeight: '600' }}>{CREDENTIAL_LABELS[type]}</Body>
            <Body style={{ color: valid ? c.good : c.textSecondary }}>
              {valid
                ? `Verified${held?.expiresOn ? `, expires ${held.expiresOn}` : ''}`
                : held
                  ? 'Expired or awaiting check'
                  : 'Not uploaded'}
            </Body>
          </Card>
        );
      })}
    </Screen>
  );
}
