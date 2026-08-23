import axios from 'axios';

const BASE = 'http://127.0.0.1:8000/api';

const client = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getModelInfo: () => client.get('/model-info/'),
  predict: (data) => client.post('/predict/', data),
  predictBatch: (list) => client.post('/predict-batch/', Array.isArray(list) ? list : (list.customers || list)),
  getDecisionBoundary: () => client.get('/decision-boundary/'),
  getSampleCustomers: () => client.get('/sample-customers/'),
  whatIf: (customer, variable_feature) => client.post('/what-if/', { customer, variable_feature }),
};
