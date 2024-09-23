import { useEffect } from 'react';

const GET_ENDPOINT =
  'https://candidate.hubteam.com/candidateTest/v3/problem/dataset?userKey=5cf963bc48e81f0d9dd6f5ff2ee4';
const POST_ENDPOINT =
  'https://candidate.hubteam.com/candidateTest/v3/problem/result?userKey=5cf963bc48e81f0d9dd6f5ff2ee4';

function App() {
  const getAndProcessAssociations = async () => {
    try {
      const response = await fetch(GET_ENDPOINT);
      const data = await response.json();
      console.log('Received data:', data);

      const validationResult = processAssociations(
        data.existingAssociations,
        data.newAssociations
      );
      console.log('Validation result:', validationResult);

      await postValidationResult(validationResult);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  };

  useEffect(() => {
    getAndProcessAssociations();
  }, []);

  const processAssociations = (existingAssociations, newAssociations) => {
    const companyMap = new Map();

    existingAssociations.forEach(({ companyId, contactId, role }) => {
      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, { roles: {}, contacts: {} });
      }
      const company = companyMap.get(companyId);

      if (!company.roles[role]) company.roles[role] = new Set();
      company.roles[role].add(contactId);

      if (!company.contacts[contactId]) company.contacts[contactId] = new Set();
      company.contacts[contactId].add(role);
    });

    const validAssociations = [];
    const invalidAssociations = [];

    newAssociations.forEach(({ companyId, contactId, role }) => {
      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, { roles: {}, contacts: {} });
      }
      const company = companyMap.get(companyId);
      const rolesForContact = company.contacts[contactId] || new Set();
      const contactsForRole = company.roles[role] || new Set();

      if (rolesForContact.has(role)) {
        invalidAssociations.push({
          companyId,
          contactId,
          role,
          failureReason: 'ALREADY_EXISTS',
        });
      } else if (rolesForContact.size >= 2) {
        invalidAssociations.push({
          companyId,
          contactId,
          role,
          failureReason: 'WOULD_EXCEED_LIMIT',
        });
      } else if (contactsForRole.size >= 5) {
        invalidAssociations.push({
          companyId,
          contactId,
          role,
          failureReason: 'WOULD_EXCEED_LIMIT',
        });
      } else {
        validAssociations.push({ companyId, contactId, role });
        rolesForContact.add(role);
        contactsForRole.add(contactId);
        company.contacts[contactId] = rolesForContact;
        company.roles[role] = contactsForRole;
      }
    });

    return { validAssociations, invalidAssociations };
  };

  const postValidationResult = async result => {
    try {
      const response = await fetch(POST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Validation result submitted successfully', responseData);
      } else {
        const errorData = await response.text();
        console.error('Failed to submit validation result', errorData);
      }
    } catch (error) {
      console.error(`Error posting validation result: ${error}`);
    }
  };

  return <div className="App">{}</div>;
}

export default App;
