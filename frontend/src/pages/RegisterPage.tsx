import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Stack, Container, Alert } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
    } catch (err: any) {
      const msg = err.response?.data;
      if (msg?.username) setError(msg.username[0]);
      else if (msg?.password) setError(msg.password[0]);
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Container size={420} w="100%">
        <Title ta="center" className="text-blue-600" mb="sm">
          Create Account
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb={30}>
          Register to start managing inventory
        </Text>

        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              {error && <Alert color="red">{error}</Alert>}
              <TextInput label="Username" required value={username} onChange={(e) => setUsername(e.currentTarget.value)} />
              <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
              <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} description="Must be at least 8 characters" />
              <Button type="submit" fullWidth loading={loading}>Register</Button>
            </Stack>
          </form>

          <Text c="dimmed" size="sm" ta="center" mt="md">
            Already have an account?{' '}
            <Anchor component={Link} to="/login" size="sm">Sign in</Anchor>
          </Text>
        </Paper>
      </Container>
    </div>
  );
}
