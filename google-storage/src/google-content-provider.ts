import {
  Storage,
  CreateBucketResponse,
  DeleteBucketResponse,
} from "@google-cloud/storage";
import utils from "./googleUtility";

import { Bucket, File } from "@google-cloud/storage";
import { Observable, of } from "rxjs";
import { from } from "rxjs";
import { AjaxResponse } from "rxjs/ajax";
import { catchError, map } from "rxjs/operators";
// @ts-ignore
import { filePathLocal, fileName, bucketName } from "../config";

function createSuccessAjaxResponse(
  response: CreateBucketResponse[1]
): AjaxResponse {
  return {
    originalEvent: {},
    xhr: {
      name: response.metadata.name,
      filepath: response.metadata.selfLink,
      type: "notebook",
      writable: "",
      created: response.metadata.timeCreated,
      last_modified: response.metadata.updated,
      mimetype: "null",
      content: null,
      format: "json",
      headers: response.headers,
    },
    request: {},
    status: 200,
    response: response.metadata,
    responseText: JSON.stringify(response.metadata),
    responseType: "json",
  };
}
function createSuccessAjaxResponseForDeleteFile(
  responseDelete: DeleteBucketResponse[0]
): AjaxResponse {
  return {
    originalEvent: {},
    xhr: {
      name: responseDelete.request.href,
      headers: responseDelete.headers,
    },
    request: {},
    status: 204,
    response: responseDelete.statusMessage,
    responseText: JSON.stringify(responseDelete.metadata),
    responseType: "json",
  };
}

function createErrorAjaxResponse(status: number, error: Error): AjaxResponse {
  return {
    originalEvent: {},
    xhr: {},
    request: {},
    status,
    response: error,
    responseText: JSON.stringify(error),
    responseType: "json",
  };
}

export class GoogleProvider {
  storage: Storage;
  bucketName: string;
  fileName: string;
  filePathLocal: string;

  constructor(bucketName: string, fileName: string, filePathLocal: string) {
    // Check if service account exists
    // # TODO Barshana Idk what you want to do in this situation, I'll leave this to you
    const serviceAccount = utils.checkServiceAccount();

    var storage = new Storage({
      projectId: serviceAccount.project_id,
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
    });
    this.storage = storage;
    this.bucketName = bucketName;
    this.fileName = fileName;
    this.filePathLocal = filePathLocal;
  }
  /**
  Get metadata of the file from the bucket
  * @param storage
  * @param bucketName
  * @param fileName
  * @returns An Observable with the response
  */
  public get(bucketName: string, fileName: string): Observable<AjaxResponse> {
    const fileBucket = this.storage.bucket(bucketName);
    const file = fileBucket.file(fileName);

    var response = from(file.get()).pipe(
      map((result) => {
        return createSuccessAjaxResponse(result[0]);
      }),
      catchError((error) => of(createErrorAjaxResponse(404, error)))
    );
    return response;
  }
  /**
   * Updates a file.
   * @param storage
   * @param bucketName
   * @returns An Observable with the response
   */
  public update(
    bucketName: string,
    fileName: string
  ): Observable<AjaxResponse> {
    throw new Error("Not supported by Google API");
  }
  /**
  Uploads the file to the bucket
  * @param storage
  * @param bucketName
  * @param filePathLocal
  * @returns An Observable with the response
  */
  public create(
    bucketName: string,
    filePathLocal: string
  ): Observable<AjaxResponse> {
    // Uploads a local file to the bucket
    const bucket = this.storage.bucket(bucketName);

    var response = from(
      bucket.upload(filePathLocal, {
        // Support for HTTP requests made with `Accept-Encoding: gzip`
        gzip: true,
        metadata: {
          cacheControl: "no-cache",
        },
      })
    ).pipe(
      map((result) => {
        return createSuccessAjaxResponse(result[0]);
      }),
      catchError((error) => of(createErrorAjaxResponse(404, error)))
    );
    console.debug(`${filePathLocal} uploaded to ${bucketName}.`);
    return response;
  }
  /**
  Deletes the file from the bucket
  * @param storage
  * @param bucketName
  * @param fileName
  * @param newContent
  * @returns An Observable with the response
  */
  public save(
    bucketName: string,
    fileName: string,
    newContent: string
  ): Observable<AjaxResponse> {
    const file = this.storage.bucket(bucketName).file(fileName);
    const contents = newContent;
    var response = from(file.save(contents)).pipe(
      map((result) => {
        // #TODO  should this be a map? Seems like result isnt being used.
        return createSuccessAjaxResponse(file);
      }),
      // #TODO is this the right http error code?
      catchError((error) => of(createErrorAjaxResponse(404, error)))
    );
    return response;
  }
  /**
  Deletes the file from the bucket
  * @param storage
  * @param bucketName
  * @param fileName
  * @returns An Observable with the request response
  */
  public remove(
    bucketName: string,
    fileName: string
  ): Observable<AjaxResponse> {
    const file = this.storage.bucket(bucketName).file(fileName);
    var response = from(file.delete()).pipe(
      map((result) => {
        return createSuccessAjaxResponseForDeleteFile(result[0]);
      }),
      // #TODO is this the right http error code?
      catchError((error) => of(createErrorAjaxResponse(404, error)))
    );
    return response;
  }

  public listCheckpoints(): Observable<AjaxResponse> {
    throw new Error("Not implemented");
  }
  public createCheckpoint(): Observable<AjaxResponse> {
    throw new Error("Not implemented");
  }
  public deleteCheckpoint(): Observable<AjaxResponse> {
    throw new Error("Not implemented");
  }
  public restoreFromCheckpoint(): Observable<AjaxResponse> {
    throw new Error("Not implemented");
  }
}

const googleprovider = new GoogleProvider(bucketName, fileName, filePathLocal);

googleprovider.get("notebook_samples", "Cell Magics.ipynb");
