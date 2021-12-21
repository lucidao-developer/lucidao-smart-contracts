# Lucidao

Collection of smart contracts, scripts and tests for the management of the Lucidao platform.

---

## Setup

The repository uses Docker Compose.
Prior to conducting any action, you must start the **contracts-env container**.

Follow the instructions to setup the repository for testing or deploying the Lucidao contracts:

- Install docker and docker-compose:

```
  $ cd docker/
  $ docker-compose -f docker-compose.yml up --build -d
```

## Testing

- Run a bash instance in the container:

```
    $ docker exec -it test_lucidao_smart_contracts bash
```

- Prepare the contracts and run the tests from inside the container:

```
    $ npx hardhat typechain
    $ npm run test --silent
```

## Development

Setup the development environment by following the next instructions:

- Create an enviroment file named **.env.development** and fill it with the following enviroment variables:

```
    $ touch .env.development
```

- Add a **Mnemonic** (only first address will be used)

        MNEMONIC=""

- Add a **Ftmscan Api Key**

        FTMSCAN_API_KEY=""

- Run the container

```
    $ docker-compose -f docker-compose.development.yml up --build -d
```

- To deploy a contract, run the associated script:

```
    $ npx hardhat run scripts/_deployScriptName_.ts
```
