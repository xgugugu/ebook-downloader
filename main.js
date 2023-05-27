#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import { program } from 'commander';
import Configstore from 'configstore';
import fs from 'fs';
import cliProgress from 'cli-progress';

import formatSize from './formatSize.js';

const config = new Configstore('xgugugu-ebooks-cli', {
    'sources': {
        'data': {
            'ylibrary': 'https://api.ylibrary.org',
            'zlib': 'https://worker.zlib.app'
        },
        'default': 'ylibrary'
    },
    'ipfs': 'https://gateway.pinata.cloud/ipfs'
});

const sources = config.get('sources').data;
const defaultSources = config.get('sources').default;
const ipfs = config.get('ipfs');

program
    .name('ebooks')
    .option('--source <string>', '', defaultSources)
    .option('--type <type>', '', 'all')
    .option('--page <number>', '', '1')
    .option('--ipfs <url>', '', ipfs)
    .option('-s, --search <key>')
    .option('-d, --download <id>')
    .option('-o, --output <path>');

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
            if (options['type'] != 'all' && options['type'] != json[i].extension) {
                continue;
            }
            console.log(`${chalk.blueBright.bold(json[i].title)} ${chalk.cyan(json[i].author)} ${chalk.bold(`(${json[i].id}, ${formatSize(json[i].filesize)})`)}`);
            console.log(`    ${chalk.greenBright(json[i].source ? ' ' + json[i].source : '')}${chalk.yellowBright(json[i].extension ? ' ' + json[i].extension : '')}${json[i].publisher ? ' ' + json[i].publisher : ''}${json[i].year ? ' ' + json[i].year : ''}`);
        }
    }).catch((err) => {
        console.log(`${chalk.red.bold('error:')} ${err.message}`);
        process.exit(-1);
    });
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
            console.log(`${chalk.blueBright.bold('OUTPUT')} ${options.output}`);
        }
        console.log(`${chalk.blueBright.bold('IPFS_CID')} ${json.ipfs_cid}`);
        const { data, headers } = await axios.get(`${ipfs}/${json.ipfs_cid}`, { responseType: 'stream' });
        let progress = new cliProgress.SingleBar({ format: `${chalk.blueBright.bold('PROGRESS')} [{bar}] {percentage}% | {value}/{total}` });
        progress.start(headers['content-length'], 0);
        data.on('data', (chunk) => progress.increment(parseInt(chunk.length)));
        data.on('end', () => progress.stop());
        data.pipe(fs.createWriteStream(options.output));
    }).catch((err) => {
        console.log(`${chalk.red.bold('error:')} ${err.message}`);
        process.exit(-1);
    });
}

program.action((options) => {
    if (options.search) search(options);
    else if (options.download) download(options);
    else program.help();
});

program.parse();
