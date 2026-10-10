import association from '../../../public/.well-known/microsoft-identity-association.json'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return association
})
