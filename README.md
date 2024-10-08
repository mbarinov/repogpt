
### Install dependencies
```shell
pnpm install
```
### Create a pgvector database
```shell
docker run -d \
  --name pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=repogpt \
  -p 5432:5432 \
  ankane/pgvector
```
### Update .env
```shell
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/repogpt
```
### Set up the database
```shell
npx prisma db push
```
### Build and start the app
```shell
pnpm build && pnpm start
```