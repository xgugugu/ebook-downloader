#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { program } from 'commander';
import Configstore from 'configstore';
import fs from 'fs';
import cliProgress from 'cli-progress';
import open from 'open';

import { formatSize, timeColor } from './util.js';

const config = new Configstore('xgugugu-ebooks-cli', {
    'sources': {
        'data': {
            'ylibrary': 'https://api.ylibrary.org',
            'zlib': 'https://worker.zlib.app'
        },
        'default': 'ylibrary'
    },
    'ipfs': 'https://gateway.pinata.cloud/ipfs',
    'ipfs_gateways': 'https://cdn.jsdelivr.net/gh/ipfs/public-gateway-checker/src/gateways.json'
});

const sources = config.get('sources').data;
const defaultSources = config.get('sources').default;
const ipfs = config.get('ipfs');
const ipfs_gateways = config.get('ipfs_gateways');


program
    .name('ebooks')
    .option('--source <string>', '', defaultSources)
    .option('--type <type>', '', 'all')
    .option('--page <number>', '', '1')
    .option('--ipfs <url>', '', ipfs)
    .option('-s, --search <key>')
    .option('-d, --download <id>')
    .option('-o, --output <path>')
    .option('-c, --config');

function error(err) {
    console.log(`${chalk.red.bold('error:')} ${err.message}`);
    process.exit(-1);
}

function search(options) {
    axios.post(
        `${sources[options['source']]}/api/search/`,
        {
            'keyword': options.search,
            'page': parseInt(options.page),
            'sensitive': false
        }
    ).then((res) => {
        let json = res.data.data;
        for (let i in json) {
            if (json[i].source != 'zlibrary') {
                continue;
            }
            if (options['type'] != 'all' && options['type'] != json[i].extension) {
                continue;
            }
            console.log(`${chalk.blueBright.bold(json[i].title)} ${chalk.cyan(json[i].author)} ${chalk.bold(`(${json[i].id}, ${formatSize(json[i].filesize)})`)}`);
            console.log(`    ${chalk.greenBright(json[i].source ? ' ' + json[i].source : '')}${chalk.yellowBright(json[i].extension ? ' ' + json[i].extension : '')}${json[i].publisher ? ' ' + json[i].publisher : ''}${json[i].year ? ' ' + json[i].year : ''}`);
        }
    }).catch(error);
}

function download(options) {
    axios.post(
        `${sources[options['source']]}/api/detail/`,
        {
            'id': parseInt(options.download),
            'source': 'zlibrary'
        }
    ).then(async (res) => {
        let json = res.data;
        if (!options.output) {
            options.output = `${json.title}.${json.extension}`;
        }
        console.log(`${chalk.blueBright.bold('OUTPUT')} ${options.output}`);
        console.log(`${chalk.blueBright.bold('IPFS_CID')} ${json.ipfs_cid}`);
        const { data, headers } = await axios.get(`${ipfs}/${json.ipfs_cid}`, { responseType: 'stream' });
        let progress = new cliProgress.SingleBar({ format: `${chalk.blueBright.bold('PROGRESS')} [{bar}] {percentage}% | {value}/{total}` });
        progress.start(headers['content-length'], 0);
        data.on('data', (chunk) => progress.increment(parseInt(chunk.length)));
        data.on('end', () => progress.stop());
        data.pipe(fs.createWriteStream(options.output));
    }).catch(error);
}

function settings(_) {
    open(config.path);
}

function check(_) {
    console.log(`${chalk.blueBright.bold('TIP')} 推荐使用本地IPFS网关而非公共网关.`);
    axios.get(ipfs_gateways).then((res) => {
        console.log(`${chalk.blueBright.bold('INFO')} Testing...`);
        let list = res.data;
        for (let i in list) {
            let url = list[i].replace(':hash', 'bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m');
            let start = 0;
            const instance = axios.create();
            instance.interceptors.request.use((cfg) => {
                start = Date.now();
                return cfg;
            });
            instance.interceptors.response.use((res) => {
                console.log(`${chalk.greenBright.bold('SUCCESS')} ${timeColor(Date.now() - start, chalk)} ${list[i].replace('/:hash', '')}`);
                return res;
            });
            instance.get(url).catch((_) => { });
        }
    }).catch(error);
}

program.action((options) => {
    if (options.search) search(options);
    else if (options.download) download(options);
    else if (options.config) settings(options);
    else if (options.ipfs == 'check') check(options);
    else program.help();
});

program.parse();
